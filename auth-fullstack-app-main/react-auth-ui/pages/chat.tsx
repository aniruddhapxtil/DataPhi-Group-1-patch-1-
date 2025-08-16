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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const router = useRouter();

  const fetchLatestChat = async () => {
    try {
      const res = await api.get('/chats/latest');
      setCurrentChat(res.data);
      setMessages(res.data.messages);
    } catch (err) {
      const newChatRes = await api.post('/chats/');
      setCurrentChat(newChatRes.data);
      setMessages([]);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLatestChat();
    }
  }, [user]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentChat) return;

    const userMessage: Message = { id: Date.now(), content: input, role: 'user' };
    
    if (currentChat.title === 'New Chat') {
        try {
            await api.patch(`/chats/${currentChat.id}`, { title: input });
            currentChat.title = input;
        } catch (err) {
            console.error('Failed to update chat title:', err);
        }
    }

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const res = await api.post(`/chats/${currentChat.id}/messages`, {
        content: userMessage.content,
        role: userMessage.role,
      });

      const updatedMessagesRes = await api.get(`/chats/${currentChat.id}/messages`);
      setMessages(updatedMessagesRes.data);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setLoading(false);
      setInput('');
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
        onSelectChat={(chat: ChatSession) => {
          setCurrentChat(chat);
          setMessages(chat.messages);
      }} />
      <div className="chat-main">
        <div className="chat-history-container">
          {messages.map((msg, index) => (
            <div key={index} className={`chat-message ${msg.role}`}>
              {msg.content}
            </div>
          ))}
          {loading && (
            <div className="chat-message assistant">
              Thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={sendMessage} className="chat-prompt-area">
          <div className="prompt-box">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="chat-input"
              placeholder="Send a message..."
              disabled={loading}
            />
            <button type="submit" className="send-button" disabled={loading}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="text-white">
                <path d="M7 11L12 6L17 11M12 18V7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
