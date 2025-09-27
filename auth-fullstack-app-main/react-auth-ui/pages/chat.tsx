"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ChatSidebar from '@/components/ChatSidebar';
import ChatMessageChart from '@/components/ChatMessageChart';

// Defines the structure for a message, which can contain text or chart data
interface Message {
  id: number;
  content: string; // This will store text, or a JSON string for chart objects
  role: 'user' | 'assistant';
  chartData?: any; // This will hold the parsed chart data for easy rendering
}

// Defines the structure for a full chat session
interface ChatSession {
  id: number;
  title: string;
  messages: Message[];
}

export default function ChatPage() {
    const [currentChat, setCurrentChat] = useState<ChatSession | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false); // Used to disable the input while streaming
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();
    const router = useRouter();

    // Toggles the visibility of the chat sidebar
    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    // Helper function to check if a message content is a chart and parse it
    const parseMessageContent = (msg: Message): Message => {
        try {
            const data = JSON.parse(msg.content);
            if (data && data.type === 'chart') {
                return { ...msg, chartData: data.data, content: '' };
            }
        } catch (e) {
            // Content is not a valid JSON object, so it's plain text
        }
        return msg;
    };

    // Fetches the user's most recent chat session on page load
    const fetchLatestChat = async () => {
        try {
            const res = await api.get('/chats/latest');
            if (res.data) {
                handleSelectChat(res.data);
            } else { // If no chats exist, create a new one
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


    // Fetches all messages for a selected chat and updates the state
    const handleSelectChat = async (chat: { id: number; title: string }) => {
        try {
            const res = await api.get(`/chats/${chat.id}/messages`);
            const parsedMessages = res.data.map(parseMessageContent); // Parse all messages
            setCurrentChat({ ...chat, messages: parsedMessages });
            setMessages(parsedMessages);
        } catch (err) {
            console.error('Error fetching chat messages:', err);
        }
    };

    // The core function for sending a prompt and handling the real-time stream
    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !currentChat) return;

        setLoading(true);
        const userMessage: Message = { id: Date.now(), content: input, role: 'user' };
        const assistantMessageId = Date.now() + 1; // Unique ID for the new assistant message bubble
        const assistantTextMessage: Message = { id: assistantMessageId, content: '', role: 'assistant' };
        
        // Optimistically add the user's message and an empty assistant bubble to the UI
        setMessages((prev) => [...prev, userMessage, assistantTextMessage]);
        const prompt = input;
        setInput('');
        
        try {
            // If this is a "New Chat", update its title with the first prompt
            if (currentChat.title === 'New Chat') {
                await api.patch(`/chats/${currentChat.id}`, { title: prompt });
                setCurrentChat(prev => prev ? { ...prev, title: prompt } : null);
            }
            
            // Get the auth token to pass to the streaming endpoint
            const token = localStorage.getItem('token');
            if (!token) throw new Error("Authentication token not found.");

            // Establish a connection to the streaming endpoint
            const eventSource = new EventSource(
                `/api/chats/${currentChat.id}/stream?prompt=${encodeURIComponent(prompt)}&token=${encodeURIComponent(token)}`
            );

            // Listener for incoming text chunks
            eventSource.addEventListener('text_chunk', (event) => {
                const data = JSON.parse(event.data);
                // Find the empty assistant bubble and append the new word to its content
                setMessages(prev =>
                    prev.map(msg => 
                        msg.id === assistantMessageId 
                            ? { ...msg, content: msg.content + data.content }
                            // Add a cursor effect while streaming
                            : msg
                    )
                );
            });

            // Listener for the final chart payload
            eventSource.addEventListener('chart_payload', (event) => {
                const data = JSON.parse(event.data);
                // Create a completely new message bubble for the chart
                const newChartMessage = parseMessageContent({
                    id: Date.now() + Math.random(),
                    role: 'assistant',
                    content: JSON.stringify(data)
                });
                setMessages(prev => [...prev, newChartMessage]);
            });

            // Listener for the end of the stream signal
            eventSource.addEventListener('end_stream', () => {
                eventSource.close(); // Close the connection
                setLoading(false); // Re-enable the input
            });

            eventSource.onerror = (err) => {
                console.error("EventSource failed:", err);
                eventSource.close();
                setLoading(false);
            };

        } catch (err) {
            console.error('Failed to connect to stream:', err);
            // If something goes wrong, remove the optimistic messages
            setMessages(prev => prev.filter(msg => msg.id !== userMessage.id && msg.id !== assistantMessageId));
            setInput(prompt); // Put the user's prompt back in the input box
            setLoading(false);
        }
    };

    // Automatically scrolls the chat history to the bottom when new messages are added
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
                        {/* Conditionally render a chart or a text bubble */}
                        {msg.chartData ? (
                          <ChatMessageChart chartData={msg.chartData} />
                        ) : (
                          <div className={`chat-message ${msg.role}`}>
                            {msg.content}
                          </div>
                        )}
                      </div>
                    ))}
                    {/* The "Thinking..." bubble is no longer needed as streaming is instant */}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={sendMessage} className="chat-input-area pt-4 pb-8">
                  <div className="prompt-box max-w-2xl mx-auto">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      className="chat-input"
                      placeholder="Ask anything..."
                      disabled={loading}
                    />
                    <button type="submit" className="send-button" disabled={loading}>
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