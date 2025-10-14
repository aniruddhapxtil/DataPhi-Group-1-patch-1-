"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import api from "../services/api";
import { useAuth, AuthProvider } from "../context/AuthContext";
import ChatSidebar from "@/components/ChatSidebar";
import ChatMessageChart from "@/components/ChatMessageChart";

interface Message {
  id: number;
  content: string;
  role: "user" | "assistant";
  chartData?: any;
}

interface ChatSession {
  id: number;
  title: string;
  messages: Message[];
}

// ✅ Inner component for chat page logic
function ChatPageContent() {
  const [currentChat, setCurrentChat] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const router = useRouter();

  // Use admin auth only if user.role === "admin"
  const adminContext = user?.role === "admin" ? useAuth() : null;

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  const parseMessageContent = (msg: Message): Message => {
    try {
      const data = JSON.parse(msg.content);
      if (data?.type === "chart") return { ...msg, chartData: data.data, content: "" };
    } catch {}
    return msg;
  };

  const fetchLatestChat = async () => {
    try {
      const res = await api.get("/chats/latest");
      if (res.data) {
        handleSelectChat(res.data);
      } else {
        const newChatRes = await api.post("/chats/");
        setCurrentChat(newChatRes.data);
        setMessages([]);
      }
    } catch {
      const newChatRes = await api.post("/chats/");
      setCurrentChat(newChatRes.data);
      setMessages([]);
    }
  };

  useEffect(() => {
    if (user) fetchLatestChat();
  }, [user]);

  const handleSelectChat = async (chat: { id: number; title: string }) => {
    try {
      const res = await api.get(`/chats/${chat.id}/messages`);
      const parsedMessages = res.data.map(parseMessageContent);
      setCurrentChat({ ...chat, messages: parsedMessages });
      setMessages(parsedMessages);
    } catch (err) {
      console.error("Error fetching chat messages:", err);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentChat) return;

    setLoading(true);
    const userMessage: Message = { id: Date.now(), content: input, role: "user" };
    const assistantMessageId = Date.now() + 1;
    const assistantTextMessage: Message = { id: assistantMessageId, content: "", role: "assistant" };
    setMessages((prev) => [...prev, userMessage, assistantTextMessage]);
    const prompt = input;
    setInput("");

    try {
      if (currentChat.title === "New Chat") {
        await api.patch(`/chats/${currentChat.id}`, { title: prompt });
        setCurrentChat((prev) => (prev ? { ...prev, title: prompt } : null));
      }

      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token not found.");

      const eventSource = new EventSource(
        `/api/chats/${currentChat.id}/stream?prompt=${encodeURIComponent(prompt)}&token=${encodeURIComponent(token)}`
      );

      eventSource.addEventListener("text_chunk", (event) => {
        const data = JSON.parse(event.data);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, content: msg.content + data.content } : msg
          )
        );
      });

      eventSource.addEventListener("chart_payload", (event) => {
        const data = JSON.parse(event.data);
        const newChartMessage = parseMessageContent({
          id: Date.now() + Math.random(),
          role: "assistant",
          content: JSON.stringify(data),
        });
        setMessages((prev) => [...prev, newChartMessage]);
      });

      eventSource.addEventListener("end_stream", () => {
        eventSource.close();
        setLoading(false);
      });

      eventSource.onerror = (err) => {
        console.error("EventSource failed:", err);
        eventSource.close();
        setLoading(false);
      };
    } catch (err) {
      console.error("Failed to connect to stream:", err);
      setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id && msg.id !== assistantMessageId));
      setInput(prompt);
      setLoading(false);
    }
  };

  useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  return (
    <div className="chat-page-container">
      <ChatSidebar
        currentChatId={currentChat?.id || null}
        onSelectChat={handleSelectChat}
        isCollapsed={isSidebarCollapsed}
      />
      <button onClick={toggleSidebar} className={`sidebar-toggle-button ${isSidebarCollapsed ? "collapsed" : ""}`}>
        {isSidebarCollapsed ? ">" : "<"}
      </button>

      <div className="flex-1 h-full flex flex-col">
        <div className="chat-history flex-grow overflow-y-auto min-h-0 p-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-message-wrapper max-w-2xl mx-auto ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.chartData ? (
                <ChatMessageChart chartData={msg.chartData} />
              ) : (
                <div className={`chat-message ${msg.role}`}>{msg.content}</div>
              )}
            </div>
          ))}
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

// ✅ Main exported ChatPage wrapper
export default function ChatPage() {
  const { user } = useAuth();

  // If admin, wrap content with AdminAuthProvider
  if (user?.role === "admin") {
    return (
      <AuthProvider>
        <ChatPageContent />
      </AuthProvider>
    );
  }

  // Normal users
  return <ChatPageContent />;
}
