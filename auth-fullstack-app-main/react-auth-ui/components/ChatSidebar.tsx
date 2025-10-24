"use client";
import { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
import '../styles/adminpage.css'

interface ChatSession {
  id: number;
  title: string;
}

interface ChatSidebarProps {
  currentChatId: number | null;
  onSelectChat: (chat: { id: number; title: string }) => void | Promise<void>;
  isCollapsed: boolean;
}

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
  const { logout, user } = useAuth();
  const [modal, setModal] = useState<{ type: 'rename' | 'delete' | null, chat: ChatSession | null }>({ type: null, chat: null });
  const [renameTitle, setRenameTitle] = useState("");
  const [menuOpenFor, setMenuOpenFor] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);

  const fetchChatSessions = async () => {
    try {
      const res = await api.get('/chats/all');
      setChatSessions(res.data || []);
    } catch (err) {
      console.error('Error fetching chats:', err);
      setChatSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const createNewChat = async () => {
    try {
      const newChat = await api.post('/chats/');
      setChatSessions(prev => [newChat.data, ...prev]);
      onSelectChat(newChat.data);
      setSearchQuery("");
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
    if (type === 'rename') setRenameTitle(chat.title);
    setMenuOpenFor(null);
  };

  const closeModal = () => {
    setModal({ type: null, chat: null });
    setRenameTitle("");
  };

  const getAvatarInitial = () => {
    if (!user?.username) return "";
    return user.username.charAt(0).toUpperCase();
  };

  useEffect(() => {
    fetchChatSessions();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setMenuOpenFor(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const filteredSessions = chatSessions.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`chat-sidebar ${isCollapsed ? 'collapsed' : ''}`}>

      <div className="chat-sessions-header">
        <h2 className="text-xl font-bold">Chat Sessions</h2>
      </div>

      <div className="search-container mt-3">
        <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          className="search-input w-full"
          placeholder="Search chats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <ul className="chat-sessions-list mt-2">
        {loading ? <p className="text-gray-400">Loading...</p> :
          filteredSessions.map(chat => (
            <li key={chat.id} className={`chat-session-item ${chat.id === currentChatId ? 'active' : ''}`} onClick={() => onSelectChat(chat)}>
              <div className="flex justify-between items-center w-full">
                <span className="truncate flex-1">{chat.title}</span>
                <div className="relative">
                  <button
                    className="menu-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenFor(menuOpenFor === chat.id ? null : chat.id);
                    }}
                  >
                    ⋮
                  </button>
                  {menuOpenFor === chat.id && (
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

      {/* Sidebar Footer */}
      <div className="sidebar-footer mt-3 px-2">
        <button onClick={createNewChat} className="new-chat-button-bottom w-full mb-3 hover:bg-gray-700 transition-colors">
          + New Chat
        </button>

        {/* Avatar + Username Dropdown */}
        <div className="relative w-full" ref={dropdownRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
            ref={avatarButtonRef}
            className="new-chat-button-bottom flex items-center gap-2 w-full py-3 px-2 hover:bg-gray-700 transition-colors"
          >
            <div className="chat-sidebar-avatar flex-shrink-0">
              {getAvatarInitial()}
            </div>
            <span className="truncate font-bold text-center flex-1">{user?.username}</span>
          </button>

          {dropdownOpen && (
            <div
              className="dropdown-menu absolute left-0 bottom-full mb-2 bg-gray-800 text-white rounded shadow z-50"
              style={{ width: avatarButtonRef.current?.offsetWidth }}
            >
              <div className="w-full text-center px-4 py-2 hover:bg-gray-700 transition-colors text-sm">
                {user?.email}
              </div>
              <hr className="border-gray-700" />

              <Link href="/profile">
                <button className="w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors text-base font-semibold">
                  👤 Profile
                </button>
              </Link>

              <Link href="/user-usage">
                <button className="w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors text-base font-semibold">
                  📊 My Token Usage
                </button>
              </Link>

              {user?.role === "admin" && (
                <Link href="/admin">
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors text-base font-semibold">
                    🧾 Admin Dashboard
                  </button>
                </Link>
              )}

              <button onClick={logout} className="w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors text-base font-semibold">
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat Modals */}
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
