import { useEffect, useState } from 'react';
import api from '../services/api';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

interface ChatSession {
  id: number;
  title: string;
}

export default function ChatSidebar({ currentChatId, onSelectChat }: { currentChatId: number | null; onSelectChat: (chat: any) => void }) {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();
  const router = useRouter();

  const fetchChatSessions = async () => {
    try {
      const res = await api.get('/chats/all');
      setChatSessions(res.data);
    } catch (err) {
      console.error('Error fetching chats:', err);
    } finally {
      setLoading(false);
    }
  };

  const createNewChat = async () => {
    try {
      const newChat = await api.post('/chats/');
      setChatSessions((prev) => [newChat.data, ...prev]);
      onSelectChat(newChat.data);
    } catch (err) {
      console.error('Error creating chat:', err);
    }
  };

  const selectChat = async (chatId: number) => {
    try {
        const res = await api.get(`/chats/${chatId}/messages`);
        const chatWithMessages = { id: chatId, title: "Chat " + chatId, messages: res.data };
        onSelectChat(chatWithMessages);
    } catch (err) {
        console.error('Error fetching chat messages:', err);
    }
  };

  useEffect(() => {
    fetchChatSessions();
  }, []);

  return (
    <div className="chat-sidebar">
      <div className="chat-sessions-header">
        <h2 className="text-xl font-bold">Chat Sessions</h2>
        <button onClick={createNewChat} className="new-chat-button">+</button>
      </div>
      <ul className="chat-sessions-list">
        {loading ? (
            <p>Loading...</p>
        ) : (
            chatSessions.map((chat) => (
                <li
                    key={chat.id}
                    onClick={() => selectChat(chat.id)}
                    className={`chat-session-item ${chat.id === currentChatId ? 'active' : ''}`}
                >
                    {chat.title}
                </li>
            ))
        )}
      </ul>
      <div className="logout-container">
        <button onClick={logout} className="logout-button">
          Logout
        </button>
      </div>
    </div>
  );
}