"use client";
import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// Define the ChatSession interface
interface ChatSession {
  id: number;
  title: string;
}

// Updated props interface: toggleSidebar is no longer needed here
interface ChatSidebarProps {
  currentChatId: number | null;
  onSelectChat: (chat: { id: number; title: string }) => void | Promise<void>;
  isCollapsed: boolean;
}

// A simple modal component for rename/delete actions
const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2 className="modal-title">{title}</h2>
                {children}
            </div>
        </div>
    );
};


export default function ChatSidebar({ currentChatId, onSelectChat, isCollapsed }: ChatSidebarProps) {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();
  const [modal, setModal] = useState<{ type: 'rename' | 'delete' | null, chat: ChatSession | null }>({ type: null, chat: null });
  const [renameTitle, setRenameTitle] = useState("");

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
      setChatSessions(prev => [newChat.data, ...prev]);
      onSelectChat(newChat.data);
    } catch (err) {
      console.error('Error creating chat:', err);
    }
  };

  const handleRename = async () => {
    if (!modal.chat || !renameTitle) return;
    try {
      await api.patch(`/chats/${modal.chat.id}`, { title: renameTitle });
      setChatSessions(prev => prev.map(c => c.id === modal.chat!.id ? { ...c, title: renameTitle } : c));
      if (currentChatId === modal.chat.id) onSelectChat({ ...modal.chat, title: renameTitle });
      closeModal();
    } catch (err) {
      console.error('Failed to rename chat:', err);
    }
  };

  const handleDelete = async () => {
    if (!modal.chat) return;
    try {
      await api.delete(`/chats/${modal.chat.id}`);
      setChatSessions(prev => prev.filter(c => c.id !== modal.chat!.id));
      if (currentChatId === modal.chat.id) {
        const res = await api.get('/chats/latest');
        if (res.data) {
            onSelectChat(res.data);
        } else {
            const newChat = await api.post('/chats/');
            onSelectChat(newChat.data);
        }
      }
      closeModal();
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  const openModal = (type: 'rename' | 'delete', chat: ChatSession) => {
    setModal({ type, chat });
    if (type === 'rename') {
      setRenameTitle(chat.title);
    }
  };

  const closeModal = () => {
    setModal({ type: null, chat: null });
    setRenameTitle("");
  };

  useEffect(() => {
    fetchChatSessions();
  }, []);

  return (
    <div className={`chat-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="chat-sessions-header">
        <h2 className="text-xl font-bold">Chat Sessions</h2>
        {/* '+' button is now removed from the header */}
      </div>
      <ul className="chat-sessions-list">
        {loading ? <p>Loading...</p> :
          chatSessions.map(chat => (
            <li key={chat.id} className={`chat-session-item ${chat.id === currentChatId ? 'active' : ''}`} onClick={() => onSelectChat(chat)}>
              <div className="flex justify-between items-center w-full">
                <span className="truncate flex-1">{chat.title}</span>
                <div className="relative">
                  <button className="menu-button" onClick={(e) => { e.stopPropagation(); openModal('rename', chat); }}>⋮</button>
                </div>
              </div>
            </li>
          ))}
      </ul>
      
      {/* Container for bottom buttons */}
      <div className="sidebar-footer">
        <button onClick={createNewChat} className="new-chat-button-bottom">
          + New Chat
        </button>
        <button onClick={logout} className="logout-button">Logout</button>
      </div>

      {/* Modal JSX for rename/delete */}
      <Modal isOpen={modal.type !== null} onClose={closeModal} title={modal.type === 'rename' ? 'Rename Chat' : 'Delete Chat'}>
        {modal.type === 'rename' && (
          <div>
            <input
              type="text"
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              className="modal-input"
              placeholder="Enter new title"
            />
            <div className="modal-actions">
              <button onClick={closeModal} className="modal-button secondary">Cancel</button>
              <button onClick={handleRename} className="modal-button primary">Save</button>
            </div>
          </div>
        )}
        {modal.type === 'delete' && (
          <div>
            <p>Are you sure you want to delete this chat: "{modal.chat?.title}"?</p>
            <div className="modal-actions">
              <button onClick={closeModal} className="modal-button secondary">Cancel</button>
              <button onClick={handleDelete} className="modal-button danger">Delete</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}