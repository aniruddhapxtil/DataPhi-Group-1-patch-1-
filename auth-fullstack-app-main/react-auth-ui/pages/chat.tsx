"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ChatSidebar from '../components/ChatSidebar';
import ChatMessageChart from '@/components/ChatMessageChart';

// Updated Message interface to handle text OR chart data
interface Message {
  id: number;
  content: string; // Will store text or a JSON string for charts
  role: 'user' | 'assistant';
  chartData?: any; // To hold parsed chart data for rendering
}

interface ChatSession {
  id: number;
  title: string;
  messages: Message[];
}

export default function ChatPage() {
    const [currentChat, setCurrentChat] = useState<ChatSession | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();
    const router = useRouter();

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    const parseMessageContent = (msg: Message): Message => {
        try {
            const data = JSON.parse(msg.content);
            if (data && data.type === 'chart') {
                return { ...msg, chartData: data.data, content: '' };
            }
        } catch (e) {
            // Not a JSON object, so it's a plain text message
        }
        return msg;
    };

    const fetchLatestChat = async () => {
        try {
            const res = await api.get('/chats/latest');
            if (res.data) {
                handleSelectChat(res.data);
            } else {
                const newChatRes = await api.post('/chats/');
                setCurrentChat(newChatRes.data);
                setMessages([]);
            }
        } catch (err) {
            console.error('No chats found, creating a new one.', err);
            try {
                const newChatRes = await api.post('/chats/');
                setCurrentChat(newChatRes.data);
                setMessages([]);
            } catch (postErr) {
                console.error('Failed to create a new chat:', postErr);
            }
        }
    };
    
    useEffect(() => {
        if (user) fetchLatestChat();
    }, [user]);


    const handleSelectChat = async (chat: { id: number; title: string }) => {
        try {
            const res = await api.get(`/chats/${chat.id}/messages`);
            const parsedMessages = res.data.map(parseMessageContent);
            const fullChatSession = { ...chat, messages: parsedMessages };
            setCurrentChat(fullChatSession);
            setMessages(parsedMessages);
        } catch (err) {
            console.error('Error fetching chat messages:', err);
        }
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !currentChat) return;

        const userMessage: Message = { id: Date.now(), content: input, role: 'user' };
        setMessages((prev) => [...prev, userMessage]);
        const prompt = input;
        setInput('');
        setLoading(true);

        try {
            if (currentChat.title === 'New Chat') {
                await api.patch(`/chats/${currentChat.id}`, { title: prompt });
                setCurrentChat(prev => prev ? { ...prev, title: prompt } : null);
            }

            const response = await fetch(`/api/chats/${currentChat.id}/stream`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ content: prompt, role: 'user' }),
            });

            if (!response.body) return;

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const payloads = buffer.split('\n\n');
                
                buffer = payloads.pop() || "";

                for (const payloadStr of payloads) {
                    if (payloadStr.startsWith('data: ')) {
                        const jsonStr = payloadStr.substring(6);
                        try {
                            const payload = JSON.parse(jsonStr);
                            const newMessage = parseMessageContent({
                                id: Date.now() + Math.random(),
                                role: 'assistant',
                                content: payload.type === 'text' ? payload.content : JSON.stringify(payload)
                            });
                            setMessages(prev => [...prev, newMessage]);
                        } catch (e) {
                            console.error("Failed to parse payload JSON:", jsonStr);
                        }
                    }
                }
            }

        } catch (err) {
            console.error('Failed to send or stream message:', err);
            setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
            setInput(prompt);
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    return (
        <div className="chat-page-container">
            <ChatSidebar
                currentChatId={currentChat?.id || null}
                onSelectChat={handleSelectChat}
                isCollapsed={isSidebarCollapsed}
                toggleSidebar={toggleSidebar}
            />
            
            <div className="flex-1 h-full flex flex-col">
                <div className="chat-history flex-grow overflow-y-auto min-h-0 p-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`chat-message-wrapper max-w-2xl mx-auto ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.chartData ? (
                          <ChatMessageChart chartData={msg.chartData} />
                        ) : (
                          <div className={`chat-message ${msg.role}`}>
                            {msg.content}
                          </div>
                        )}
                      </div>
                    ))}
                    {loading && (
                      <div className="chat-message-wrapper max-w-2xl mx-auto justify-start">
                        <div className="chat-message assistant">Thinking...</div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={sendMessage} className="chat-input-area pt-4 pb-8">
                  <div className="prompt-box max-w-2xl mx-auto">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      className="chat-input"
                      placeholder="Ask anything"
                      disabled={loading}
                    />
                    <button type="submit" className="send-button" disabled={loading}>
                      {/* ✅ Corrected viewBox attribute */}
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5.14v13.72L18.72 12 8 5.14z"></path>
                      </svg>
                    </button>
                  </div>
                </form>
            </div>
        </div>
    );
}