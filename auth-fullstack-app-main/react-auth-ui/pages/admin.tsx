import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import axios from "axios";
import "../styles/adminpage.css";

interface TokenUsage {
  user_id: number;
  model: string;
  user_query: string;
  prompt_tokens: number;
  response_tokens: number;
  total_tokens: number;
  timestamp: string;
}

export default function AdminPage() {
  const { user, token } = useAuth();
  const { theme } = useTheme();

  const [usage, setUsage] = useState<TokenUsage[]>([]);
  const [filteredUsage, setFilteredUsage] = useState<TokenUsage[]>([]);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    user_id: "",
    timestamp: "",
    model: "",
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const totalPages = Math.ceil(filteredUsage.length / itemsPerPage);

  useEffect(() => {
    const fetchUsage = async () => {
      if (!token || !user || user.role !== "admin") {
        setError("You are not authorized to view this page.");
        return;
      }
      try {
        const res = await axios.get("http://localhost:8000/admin/token-usage", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsage(res.data);
        setFilteredUsage(res.data);
      } catch (err) {
        console.error(err);
        setError("Unable to fetch token usage history.");
      }
    };
    fetchUsage();
  }, [token, user]);

  // Filter Logic
  useEffect(() => {
    const filtered = usage.filter((u) => {
      const userMatch = u.user_id.toString().includes(filters.user_id);
      const timeMatch = u.timestamp
        .toLowerCase()
        .includes(filters.timestamp.toLowerCase());
      const modelMatch = u.model
        .toLowerCase()
        .includes(filters.model.toLowerCase());
      return userMatch && timeMatch && modelMatch;
    });
    setFilteredUsage(filtered);
    setCurrentPage(1);
  }, [filters, usage]);

  if (!user || user.role !== "admin") {
    return (
      <p className="p-6 text-red-500">
        {error || "You are not authorized to view this page."}
      </p>
    );
  }

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentLogs = filteredUsage.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className={`admin-container ${theme === "dark" ? "dark" : "light"}`}>
      <div className="admin-card">
        <div className="dashboard-header">
          <button
            className="chat-btn"
            onClick={() => (window.location.href = "/chat")}
          >
            💬 Go to Chat Page
          </button>
          <h1 className="admin-title">🧾 Admin Token Usage Dashboard</h1>
        </div>

        <div className="table-container">
          <table className="token-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Timestamp</th>
                <th>Model</th>
                <th>User Query</th>
                <th>Prompt Tokens</th>
                <th>Response Tokens</th>
                <th>Total Tokens</th>
              </tr>

              {/* Filter Row */}
              <tr className="filter-row">
                <th>
                  <input
                    type="text"
                    name="user_id"
                    placeholder="Filter by ID"
                    value={filters.user_id}
                    onChange={handleFilterChange}
                  />
                </th>
                <th>
                  <input
                    type="text"
                    name="timestamp"
                    placeholder="Filter by Time"
                    value={filters.timestamp}
                    onChange={handleFilterChange}
                  />
                </th>
                <th>
                  <input
                    type="text"
                    name="model"
                    placeholder="Filter by Model"
                    value={filters.model}
                    onChange={handleFilterChange}
                  />
                </th>
                <th colSpan={4}></th>
              </tr>
            </thead>

            <tbody>
              {currentLogs.map((u, idx) => (
                <tr
                  key={idx}
                  className={idx % 2 === 0 ? "even-row" : "odd-row"}
                >
                  <td>{u.user_id}</td>
                  <td>{new Date(u.timestamp).toLocaleString()}</td>
                  <td>
                    <span className="model-badge">{u.model}</span>
                  </td>
                  <td>{u.user_query}</td>
                  <td>{u.prompt_tokens}</td>
                  <td>{u.response_tokens}</td>
                  <td className="total-tokens">{u.total_tokens}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="footer-box">
          <div className="footer-left">
            Total Logs Displayed:{" "}
            <span className="footer-count">{filteredUsage.length}</span>
          </div>

          <div className="pagination">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="page-btn"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`page-number ${
                  currentPage === i + 1 ? "active" : ""
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={currentPage === totalPages}
              className="page-btn"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
