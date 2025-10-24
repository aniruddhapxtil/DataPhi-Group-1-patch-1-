// user.usage.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import axios from "axios";
import "../styles/adminpage.css"; // Reuse admin styling

interface TokenUsage {
  user_id: number;
  model: string;
  user_query: string;
  prompt_tokens: number;
  response_tokens: number;
  total_tokens: number;
  timestamp: string;
}

const modelRates: Record<string, number> = {
  "gpt-4": 0.00002,
  "claude-3": 0.000007,
  "gemini-1.5": 0.00000325,
  "gpt-3.5": 0.000001,
  "default": 0.000001,
};

export default function UserUsagePage() {
  const { user, token, logout } = useAuth();
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

  useEffect(() => {
    const fetchUsage = async () => {
      if (!token || !user) {
        setError("Please log in to view your token usage.");
        return;
      }

      try {
        const res = await axios.get("http://localhost:8000/chats/user/token-usage", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsage(res.data || []);
        setFilteredUsage(res.data || []);
      } catch (err) {
        console.error(err);
        setError("Unable to fetch your token usage history.");
      }
    };

    fetchUsage();
  }, [token, user]);

  // Filter logic
  useEffect(() => {
    const filtered = usage.filter((u) => {
      const userMatch = u.user_id.toString().includes(filters.user_id);
      const timeMatch = u.timestamp.toLowerCase().includes(filters.timestamp.toLowerCase());
      const modelMatch = u.model.toLowerCase().includes(filters.model.toLowerCase());
      return userMatch && timeMatch && modelMatch;
    });
    setFilteredUsage(filtered);
    setCurrentPage(1);
  }, [filters, usage]);

  if (!user) {
    return <p className="p-6 text-red-500">{error || "Please log in first."}</p>;
  }

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  // Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentLogs = filteredUsage.slice(startIndex, startIndex + itemsPerPage);

  // Overall totals
  const totalUserQueries = usage.length;
  const totalTokensProcessed = usage.reduce((acc, u) => acc + (u.total_tokens || 0), 0);
  const totalResponseTokens = usage.reduce((acc, u) => acc + (u.response_tokens || 0), 0);

  // Billing summary
  const chargesByModel = useMemo(() => {
    const m: Record<string, { query_cost: number; response_cost: number; total: number }> = {};
    usage.forEach((u) => {
      const rate = modelRates[u.model] ?? modelRates["default"];
      const promptCost = (u.prompt_tokens || 0) * rate;
      const responseCost = (u.response_tokens || 0) * rate;
      const total = (u.total_tokens || 0) * rate;
      if (!m[u.model]) m[u.model] = { query_cost: 0, response_cost: 0, total: 0 };
      m[u.model].query_cost += promptCost;
      m[u.model].response_cost += responseCost;
      m[u.model].total += total;
    });
    ["gpt-4","claude-3","gemini-1.5","gpt-3.5"].forEach((model) => {
      if (!m[model]) m[model] = { query_cost: 0, response_cost: 0, total: 0 };
    });
    return m;
  }, [usage]);

  const totalCharged = Object.values(chargesByModel).reduce((acc, c) => acc + c.total, 0);
  const projectedTotalCost = totalCharged * 1.15;

  const formatCurrency = (v: number) => `$${v.toFixed(6).replace(/\.?0+$/, "")}`;

  return (
    <div className={`admin-container ${theme === "dark" ? "dark" : "light"}`}>

      {/* My Console Header with Avatar */}
      <div className="admin-card">
        <div className="dashboard-header header-top">
          <div className="left-group">
            <button className="chat-btn" onClick={() => (window.location.href = "/chat")}>💬 Move to Chat Page</button>
            <div className="admin-title-block">
              <h1 className="admin-title">My Console</h1>
              <p className="welcome-text">Welcome {user?.username || user?.email}</p>
            </div>
          </div>

          <div className="admin-account">
            <div className="avatar">{(user?.username?.[0] || "U").toUpperCase()}</div>
            <div className="account-info">
              <div className="account-email">{user?.email}</div>
              <div className="account-role">User</div>
            </div>
            <button className="logout-btn" onClick={logout}>Logout</button>
          </div>
        </div>
      </div>

      {/* Overall Totals */}
      <div className="admin-card">
        <h2 className="section-title">Overall System Totals</h2>
        <div className="totals-row">
          <div className="total-box">
            <div className="total-label">TOTAL USER QUERIES</div>
            <div className="total-value">{totalUserQueries}</div>
          </div>
          <div className="total-box">
            <div className="total-label">TOTAL TOKENS PROCESSED</div>
            <div className="total-value">{totalTokensProcessed.toLocaleString()}</div>
          </div>
          <div className="total-box">
            <div className="total-label">TOTAL RESPONSE QUERIES</div>
            <div className="total-value">{totalResponseTokens.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Billing Summary */}
      <div className="admin-card">
        <h3 className="section-title">Billing Summary</h3>
        <div className="billing-cards">
          <div className="charges-card">
            <h4>Total Charges by Model</h4>
            <table className="charges-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Prompt Cost</th>
                  <th>Response Cost</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(chargesByModel).map(([model, c]) => (
                  <tr key={model}>
                    <td>{model}</td>
                    <td>{formatCurrency(c.query_cost)}</td>
                    <td>{formatCurrency(c.response_cost)}</td>
                    <td className="green">{formatCurrency(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="period-card">
            <h4>Period Estimated Cost</h4>
            <div className="period-row">
              <div className="period-label">Total Charged (Actual):</div>
              <div className="period-value">{formatCurrency(totalCharged)}</div>
            </div>
            <div className="period-row">
              <div className="period-label">Projected Total Cost:</div>
              <div className="period-value projected">{formatCurrency(projectedTotalCost)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Usage Records */}
      <div className="admin-card">
        <h3 className="section-title">Detailed Usage Records</h3>
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
                <th>Cost</th>
              </tr>
              <tr className="filter-row">
                <th>
                  <input type="text" name="user_id" placeholder="Filter by ID" value={filters.user_id} onChange={handleFilterChange} />
                </th>
                <th>
                  <input type="text" name="timestamp" placeholder="Filter by Time" value={filters.timestamp} onChange={handleFilterChange} />
                </th>
                <th>
                  <input type="text" name="model" placeholder="Filter by Model" value={filters.model} onChange={handleFilterChange} />
                </th>
                <th colSpan={5}></th>
              </tr>
            </thead>
            <tbody>
              {currentLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-4">No token usage records found.</td>
                </tr>
              ) : (
                currentLogs.map((u, idx) => {
                  const rate = modelRates[u.model] ?? modelRates["default"];
                  const cost = (u.total_tokens || 0) * rate;
                  return (
                    <tr key={idx} className={idx % 2 === 0 ? "even-row" : "odd-row"}>
                      <td>{u.user_id}</td>
                      <td>{new Date(u.timestamp).toLocaleString()}</td>
                      <td><span className="model-badge">{u.model}</span></td>
                      <td>{u.user_query}</td>
                      <td>{u.prompt_tokens}</td>
                      <td>{u.response_tokens}</td>
                      <td className="total-tokens">{u.total_tokens}</td>
                      <td className="green">{formatCurrency(cost)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="footer-box">
          <div className="footer-left">
            Total Logs Displayed: <span className="footer-count">{filteredUsage.length}</span>
          </div>
          <div className="pagination">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="page-btn">Previous</button>
            {Array.from({ length: Math.max(1, Math.ceil(filteredUsage.length / itemsPerPage)) }, (_, i) => (
              <button key={i} onClick={() => setCurrentPage(i + 1)} className={`page-number ${currentPage === i + 1 ? "active" : ""}`}>{i + 1}</button>
            ))}
            <button onClick={() => setCurrentPage((p) => Math.min(Math.ceil(filteredUsage.length / itemsPerPage), p + 1))} disabled={currentPage === Math.ceil(filteredUsage.length / itemsPerPage)} className="page-btn">Next</button>
          </div>
        </div>
      </div>

    </div>
  );
}