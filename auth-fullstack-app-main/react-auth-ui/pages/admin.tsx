"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import api from "../services/api";
import "../styles/adminpage.css";

// Interface for a single token usage log
interface TokenUsage {
  user_id: number;
  model: string;
  user_query: string;
  prompt_tokens: number;
  response_tokens: number;
  total_tokens: number;
  timestamp: string;
  cost: number;
}

// Interface for aggregated data per user
interface UserAggregate {
  user_id: number;
  last_login: string;
  status: string;
  total_queries: number;
  total_response_tokens: number;
  total_prompt_tokens: number;
  total_tokens: number;
  total_cost: number;
  est_next_cost: number;
  email?: string;
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];
const YEARS = [2020,2021,2022,2023,2024,2025];

export default function AdminPage() {
  const { user, token, logout } = useAuth();
  const { theme } = useTheme();

  const [usage, setUsage] = useState<TokenUsage[]>([]);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ user_id: "", timestamp: "", model: "" });
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [currentPage, setCurrentPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const itemsPerPage = 8;
  const usersPerPage = 10;
  
  const modelRates: Record<string, number> = {
    "gpt-4": 0.00002,
    "claude-3": 0.000007,
    "gemini-1.5": 0.00000325,
    "gpt-3.5": 0.000001,
    "default": 0.000001,
  };

  useEffect(() => {
    const fetchUsage = async () => {
      if (!token || !user || user.role !== "admin") {
        setError("You are not authorized to view this page.");
        return;
      }
      try {
        const res = await api.get("/admin/token-usage");
        setUsage(res.data || []);
      } catch (err) {
        console.error(err);
        setError("Unable to fetch token usage history.");
      }
    };
    if (token && user) {
        fetchUsage();
    }
  }, [token, user]);

  const filteredUsage = useMemo(() => {
    return usage.filter((u) => {
        const userMatch = u.user_id.toString().includes(filters.user_id);
        const timeMatch = u.timestamp.toLowerCase().includes(filters.timestamp.toLowerCase());
        const modelMatch = u.model.toLowerCase().includes(filters.model.toLowerCase());
        return userMatch && timeMatch && modelMatch;
    });
  }, [filters, usage]);
  
  const userAggregates: UserAggregate[] = useMemo(() => {
      const map = new Map<number, UserAggregate>();
      usage.forEach((u) => {
        const id = u.user_id;
        const existing = map.get(id);
        const cost = u.cost || 0;
        const time = new Date(u.timestamp).toISOString();

        if (!existing) {
          map.set(id, {
            user_id: id,
            last_login: time,
            status: "Active",
            total_queries: 1,
            total_response_tokens: u.response_tokens || 0,
            total_prompt_tokens: u.prompt_tokens || 0,
            total_tokens: u.total_tokens || 0,
            total_cost: cost,
            est_next_cost: cost * 1.1,
          });
        } else {
          existing.total_queries += 1;
          existing.total_response_tokens += u.response_tokens || 0;
          existing.total_prompt_tokens += u.prompt_tokens || 0;
          existing.total_tokens += u.total_tokens || 0;
          existing.total_cost += cost;
          existing.est_next_cost = existing.total_cost * 1.1;
          if (new Date(time) > new Date(existing.last_login)) {
            existing.last_login = time;
          }
        }
      });
      return Array.from(map.values()).sort((a, b) => a.user_id - b.user_id);
  }, [usage]);
  
  const chargesByModel = useMemo(() => {
      const m: Record<string, { query_cost: number; response_cost: number; total: number }> = {};
      usage.forEach((u) => {
        const rate = modelRates[u.model] ?? modelRates["default"];
        const promptCost = (u.prompt_tokens || 0) * rate;
        const responseCost = (u.response_tokens || 0) * rate;
        const total = u.cost || 0;
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

  if (!user || user.role !== "admin") {
    return (
      <p className="p-6 text-red-500 text-center">
        {error || "You are not authorized to view this page. Please log in as an administrator."}
      </p>
    );
  }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentLogs = filteredUsage.slice(startIndex, startIndex + itemsPerPage);
  
  const totalUserQueries = usage.length;
  const totalTokensProcessed = usage.reduce((acc, u) => acc + (u.total_tokens || 0), 0);
  const uniqueUsers = new Set(usage.map((u) => u.user_id)).size;

  const totalUserPages = Math.max(1, Math.ceil(userAggregates.length / usersPerPage));
  const userStart = (userPage - 1) * usersPerPage;
  const currentUserPage = userAggregates.slice(userStart, userStart + usersPerPage);
  
  const totalCharged = Object.values(chargesByModel).reduce((acc, c) => acc + c.total, 0);
  const projectedTotalCost = totalCharged * 1.15;

  const formatCurrency = (v: number) => `$${v.toFixed(6).replace(/\.?0+$/, "")}`;

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(e.target.value);
  };
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(parseInt(e.target.value, 10));
  };

  const now = new Date();
  const selectedIsCurrent =
    selectedMonth === MONTHS[now.getMonth()] && selectedYear === now.getFullYear();

  return (
    <div className={`admin-container ${theme === "dark" ? "dark" : "light"}`}>
       <div className="admin-card">
        <div className="dashboard-header header-top">
          <div className="left-group">
            <div className="admin-title-block">
              <h1 className="admin-title">Admin Console</h1>
              <p className="welcome-text">Welcome {user?.username || user?.email || "Admin"}</p>
            </div>
          </div>
          <div className="admin-account">
            <div className="avatar">A</div>
            <div className="account-info">
              <div className="account-email">{user?.email}</div>
              <div className="account-role">Administrator</div>
            </div>
            <button className="logout-btn" onClick={logout}>Logout</button>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <h2 className="section-title">Overall System Totals</h2>
        <div className="totals-row">
          <div className="total-box"><div className="total-label">TOTAL USER QUERIES</div><div className="total-value">{totalUserQueries}</div></div>
          <div className="total-box"><div className="total-label">TOTAL TOKENS PROCESSED</div><div className="total-value">{totalTokensProcessed.toLocaleString()}</div></div>
          <div className="total-box"><div className="total-label">TOTAL UNIQUE USERS</div><div className="total-value">{uniqueUsers}</div></div>
        </div>
      </div>

      <div className="admin-card">
        <div className="billing-header">
          <h3 className="section-title">Billing Summary</h3>
          <div className="billing-filters">
            <label>Filter Period:</label>
            <select value={selectedMonth} onChange={handleMonthChange}>{MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}</select>
            <select value={selectedYear} onChange={handleYearChange}>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select>
            <div className="billing-summary-text">{selectedIsCurrent ? `Current Month Summary (${selectedYear})` : `${selectedMonth} ${selectedYear} Summary`}</div>
          </div>
        </div>
        <div className="billing-cards">
          <div className="charges-card">
            <h4>Total Charges by Model</h4>
            <table className="charges-table">
              <thead><tr><th>Model</th><th>Query Cost</th><th>Response Cost</th><th>Total</th></tr></thead>
              <tbody>{Object.entries(chargesByModel).map(([model, c]) => (<tr key={model}><td>{model}</td><td>{formatCurrency(c.query_cost)}</td><td>{formatCurrency(c.response_cost)}</td><td className="green">{formatCurrency(c.total)}</td></tr>))}</tbody>
            </table>
          </div>
          <div className="period-card">
            <h4>Period Estimated Cost</h4>
            <div className="period-row"><div className="period-label">Total Charged (Actual):</div><div className="period-value">{formatCurrency(totalCharged)}</div></div>
            <div className="period-row"><div className="period-label">Projected Total Cost:</div><div className="period-value projected">{formatCurrency(projectedTotalCost)}</div></div>
            <p className="period-note">Projection based on current usage trends for all users in the selected month/year.</p>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <h3 className="section-title">User Login Activity</h3>
        <div className="table-container">
          <table className="token-table">
            <thead><tr><th>User ID</th><th>Last Login</th><th>Status</th><th>Total Queries</th><th>Total Response Tokens</th><th>Total Tokens</th><th>Total Cost</th><th>Est. Next Cost</th></tr></thead>
            <tbody>{currentUserPage.map((u, idx) => (<tr key={u.user_id} className={idx % 2 === 0 ? "even-row" : "odd-row"}><td>{u.user_id}</td><td>{new Date(u.last_login).toLocaleString()}</td><td><span className={`status-pill ${u.status}`}>{u.status}</span></td><td>{u.total_queries}</td><td>{u.total_response_tokens.toLocaleString()}</td><td>{u.total_tokens.toLocaleString()}</td><td className="green">{formatCurrency(u.total_cost)}</td><td className="purple">{formatCurrency(u.est_next_cost)}</td></tr>))}</tbody>
          </table>
          <div className="user-activity-footer">
            <div className="footer-left">Total Users: <span className="footer-count">{userAggregates.length}</span></div>
            <div className="user-pagination">
              <button onClick={() => setUserPage((p) => Math.max(1, p - 1))} disabled={userPage === 1}>Prev</button>
              {Array.from({ length: totalUserPages }, (_, i) => <button key={i} onClick={() => setUserPage(i+1)} className={userPage === i+1 ? "active" : ""}>{i+1}</button>)}
              <button onClick={() => setUserPage((p) => Math.min(totalUserPages, p + 1))} disabled={userPage === totalUserPages}>Next</button>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <h3 className="section-title">Detailed Usage Records</h3>
        <div className="table-container">
          <table className="token-table">
            <thead>
              <tr><th>User ID</th><th>Timestamp</th><th>Model</th><th>User Query</th><th>Prompt Tokens</th><th>Response Tokens</th><th>Total Tokens</th><th>Cost</th></tr>
              <tr className="filter-row">
                <th><input type="text" name="user_id" placeholder="Filter by ID" value={filters.user_id} onChange={handleFilterChange} /></th>
                <th><input type="text" name="timestamp" placeholder="Filter by Time" value={filters.timestamp} onChange={handleFilterChange} /></th>
                <th><input type="text" name="model" placeholder="Filter by Model" value={filters.model} onChange={handleFilterChange} /></th>
                <th colSpan={5}></th>
              </tr>
            </thead>
            <tbody>{currentLogs.map((u, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "even-row" : "odd-row"}>
                    <td>{u.user_id}</td>
                    <td>{new Date(u.timestamp).toLocaleString()}</td>
                    <td><span className="model-badge">{u.model}</span></td>
                    <td>{u.user_query}</td>
                    <td>{u.prompt_tokens}</td>
                    <td>{u.response_tokens}</td>
                    <td className="total-tokens">{u.total_tokens}</td>
                    <td className="green">{formatCurrency(u.cost)}</td>
                </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="footer-box">
          <div className="footer-left">Total Detailed Logs: <span className="footer-count">{filteredUsage.length}</span></div>
          <div className="pagination">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="page-btn">Previous</button>
            {Array.from({ length: Math.max(1, Math.ceil(filteredUsage.length / itemsPerPage)) }, (_, i) => <button key={i} onClick={() => setCurrentPage(i+1)} className={`page-number ${currentPage === i+1 ? "active" : ""}`}>{i+1}</button>)}
            <button onClick={() => setCurrentPage((p) => Math.min(Math.ceil(filteredUsage.length / itemsPerPage), p + 1))} disabled={currentPage === Math.ceil(filteredUsage.length / itemsPerPage)} className="page-btn">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

