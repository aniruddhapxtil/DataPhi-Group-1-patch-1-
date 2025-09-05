"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ChatSidebar from '../components/ChatSidebar';

interface Message {
  id: number;
  content: string;
  role: 'user' | 'assistant';
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // State for sidebar
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const router = useRouter();

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
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
      const fullChatSession = { ...chat, messages: res.data };
      setCurrentChat(fullChatSession);
      setMessages(res.data);
    } catch (err) {
      console.error('Error fetching chat messages:', err);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentChat) return;

    const userMessage: Message = { id: Date.now(), content: input, role: 'user' };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      if (currentChat.title === 'New Chat') {
        await api.patch(`/chats/${currentChat.id}`, { title: input });
        setCurrentChat(prev => prev ? { ...prev, title: input } : null);
      }
      
      await api.post(`/chats/${currentChat.id}/messages`, { content: userMessage.content, role: 'user' });
      
      const updatedMessagesRes = await api.get(`/chats/${currentChat.id}/messages`);
      setMessages(updatedMessagesRes.data);

    } catch (err) {
      console.error('Failed to send message:', err);
      setInput(userMessage.content);
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
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
        // The toggleSidebar prop is removed as the button is now managed here
      />
      
      {/* This is the new hover container that shows the button */}
      <div className={`sidebar-toggle-container ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <button onClick={toggleSidebar} className="toggle-button-visual">
          {isSidebarCollapsed ? '>' : '<'}
        </button>
      </div>

      <div className="flex-1 h-full flex flex-col">
        <div className="chat-history flex-grow overflow-y-auto min-h-0 p-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`chat-message-wrapper max-w-2xl mx-auto ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`chat-message ${msg.role}`}>
                  {msg.content}
                </div>
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
              <svg width="24" height="24" viewBox="0 0 24" fill="currentColor">
                <path d="M8 5.14v13.72L18.72 12 8 5.14z"></path>
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}