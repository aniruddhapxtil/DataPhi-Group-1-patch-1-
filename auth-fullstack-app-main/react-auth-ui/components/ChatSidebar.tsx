"use client";

import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ChatSession {
  id: number;
  title: string;
}

interface ModalState {
  type: 'rename' | 'delete' | null;
  chat: ChatSession | null;
}

interface ChatSidebarProps {
  currentChatId: number | null;
  onSelectChat: (chat: ChatSession) => void | Promise<void>;
}

export default function ChatSidebar({ currentChatId, onSelectChat }: ChatSidebarProps) {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  
  const [modal, setModal] = useState<ModalState>({ type: null, chat: null });
  const [renameTitle, setRenameTitle] = useState('');

  const fetchChatSessions = async () => {
    setLoading(true);
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
      fetchChatSessions();
      onSelectChat(newChat.data);
    } catch (err) {
      console.error('Error creating chat:', err);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!modal.chat || !renameTitle) return;
      try {
          await api.patch(`/chats/${modal.chat.id}`, { title: renameTitle });
          fetchChatSessions();
          if (currentChatId === modal.chat.id) {
              onSelectChat({ ...modal.chat, title: renameTitle });
          }
      } catch (err) {
          console.error('Failed to rename chat:', err);
      } finally {
          closeModal();
      }
  };

  const handleDelete = async () => {
      if (!modal.chat) return;
      try {
          await api.delete(`/chats/${modal.chat.id}`);
          setChatSessions(prev => prev.filter(c => c.id !== modal.chat!.id));
          if (currentChatId === modal.chat.id) {
              const res = await api.get('/chats/latest').catch(() => null);
              if (res && res.data) {
                  onSelectChat(res.data);
              } else {
                  createNewChat();
              }
          }
      } catch (err) {
          console.error('Failed to delete chat:', err);
      } finally {
          closeModal();
      }
  };

  const openModal = (type: 'rename' | 'delete', chat: ChatSession) => {
    setMenuOpenId(null);
    setModal({ type, chat });
    if (type === 'rename') {
      setRenameTitle(chat.title);
    }
  };

  const closeModal = () => {
    setModal({ type: null, chat: null });
    setRenameTitle('');
  };

  useEffect(() => {
    fetchChatSessions();
  }, []);

  return (
    <>
      {/* ✅ The main container is now explicitly a flex column */}
      <div className="chat-sidebar flex flex-col">
        <div className="chat-sessions-header">
          <h2 className="text-xl font-bold">Chat Sessions</h2>
          <button onClick={createNewChat} className="new-chat-button">+</button>
        </div>
        {/* ✅ The list will grow to fill space (flex-1) and scroll (overflow-y-auto) */}
        <ul className="chat-sessions-list flex-1 overflow-y-auto">
          {loading ? <p>Loading...</p> :
            chatSessions.map(chat => (
              <li key={chat.id} 
                  className={`chat-session-item ${chat.id === currentChatId ? 'active' : ''}`}
                  onClick={() => onSelectChat(chat)}
              >
                <div className="flex justify-between items-center">
                  <span>{chat.title}</span>
                  <div className="relative">
                    <button className="menu-button" onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === chat.id ? null : chat.id);
                    }}>⋮</button>
                    {menuOpenId === chat.id && (
                      <div className="dropdown-menu">
                        <button onClick={(e) => { e.stopPropagation(); openModal('rename', chat); }}>Rename</button>
                        <button onClick={(e) => { e.stopPropagation(); openModal('delete', chat); }}>Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
        </ul>
        {/* ✅ This div pushes the logout button to the bottom */}
        <div className="mt-auto">
          <button onClick={logout} className="logout-button">Logout</button>
        </div>
      </div>

      {/* Modal for Renaming and Deleting */}
      {modal.type && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {modal.type === 'rename' && modal.chat && (
              <form onSubmit={handleRename}>
                <h3 className="modal-title">Rename Chat</h3>
                <p>Enter a new title for "{modal.chat.title}"</p>
                <input 
                  type="text" 
                  value={renameTitle}
                  onChange={(e) => setRenameTitle(e.target.value)}
                  className="modal-input"
                  autoFocus
                />
                <div className="modal-actions">
                  <button type="button" className="modal-button secondary" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="modal-button primary">Save</button>
                </div>
              </form>
            )}
            {modal.type === 'delete' && modal.chat && (
              <div>
                <h3 className="modal-title">Delete Chat</h3>
                <p>Are you sure you want to delete "{modal.chat.title}"? This action cannot be undone.</p>
                <div className="modal-actions">
                  <button type="button" className="modal-button secondary" onClick={closeModal}>Cancel</button>
                  <button type="button" className="modal-button danger" onClick={handleDelete}>Delete</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
