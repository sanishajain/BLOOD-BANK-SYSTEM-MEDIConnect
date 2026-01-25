import { useEffect, useState } from "react";
import { api } from "../api";
import "../css/admin.css";
import { useNavigate } from "react-router-dom";

const ALL_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function AdminDashboard() {
  const nav = useNavigate();
  const token = localStorage.getItem("token");

  const [view, setView] = useState("stocks");
  const [stocks, setStocks] = useState([]);
  const [requests, setRequests] = useState([]);
  const [donors, setDonors] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ bloodGroup: "", units: "" });

  useEffect(() => {
    if (!token) return;
    loadStocks();
    loadRequests();
    loadDonors();
    loadUsers();
  }, [token]);

  const loadStocks = async () => {
    const res = await api("/api/admin/stocks/stock", "GET", null, token);
    if (res?.stocks) setStocks(res.stocks);
  };

  const loadRequests = async () => {
    const res = await api("/api/admin/requests", "GET", null, token);
    if (Array.isArray(res)) setRequests(res);
  };

  const loadDonors = async () => {
    const res = await api("/api/admin/donors", "GET", null, token);
    if (Array.isArray(res)) setDonors(res);
  };

  const loadUsers = async () => {
    const res = await api("/api/admin/users", "GET", null, token);
    if (Array.isArray(res)) setUsers(res);
  };

  const addStock = async () => {
    if (!form.bloodGroup || !form.units) return alert("Fill all fields");
    await api(
      "/api/admin/stocks/add-stock",
      "POST",
      { bloodGroup: form.bloodGroup, units: Number(form.units) },
      token
    );
    setForm({ bloodGroup: "", units: "" });
    loadStocks();
  };

  const updateStock = async (id, units) => {
    await api(
      `/api/admin/stocks/update-stock/${id}`,
      "PUT",
      { units: Number(units) },
      token
    );
    loadStocks();
  };

  const deleteStock = async (id) => {
    await api(`/api/admin/stocks/delete-stock/${id}`, "DELETE", null, token);
    loadStocks();
  };

  const approve = async (id) => {
    const res = await api(`/api/admin/approve-request/${id}`, "POST", null, token);
    if (res?.message) {
      alert(res.message);
      loadRequests();
      loadStocks();
    }
  };

  const reject = async (id) => {
    const res = await api(`/api/admin/reject-request/${id}`, "POST", null, token);
    if (res?.message) {
      alert(res.message);
      loadRequests();
    }
  };

  const approveBan = async (id) => {
    const res = await api(`/api/admin/ban/${id}`, "PUT", null, token);
    if (res?.message) {
      alert(res.message);
      loadUsers();
    }
  };

  const logout = () => {
    localStorage.clear();
    nav("/");
  };

  const mergedStocks = ALL_GROUPS.map(bg => {
    const found = stocks.find(s => s.bloodGroup === bg);
    return found || { _id: bg, bloodGroup: bg, units: 0, isNew: true };
  });

  const handleStockChange = (id, value) => {
    setStocks(prev =>
      prev.map(x => (x._id === id ? { ...x, units: Number(value) } : x))
    );
  };

  const isLow = u => u <= 5;

  const isEligible = (date) => {
    if (!date) return true;
    const diff = (new Date() - new Date(date)) / (1000 * 60 * 60 * 24);
    return diff >= 90;
  };

  return (
    <div className="admin-layout">
      <div className="sidebar">
        <h2>Admin</h2>
        <button onClick={() => setView("stocks")}>Stock</button>
        <button onClick={() => setView("requests")}>Requests</button>
        <button onClick={() => setView("history")}>History</button>
        <button onClick={() => setView("users")}>Users</button>
        <button onClick={() => setView("donors")}>Donors</button>
        <button className="logout" onClick={logout}>Logout</button>
      </div>

      <div className="main-content">
        {view === "stocks" && (
          <>
            <h2>Blood Stock</h2>
            <div className="add-box">
              <select
                value={form.bloodGroup}
                onChange={e => setForm({ ...form, bloodGroup: e.target.value })}
              >
                <option value="">Group</option>
                {ALL_GROUPS.map(b => <option key={b}>{b}</option>)}
              </select>
              <input
                type="number"
                placeholder="Units"
                value={form.units}
                onChange={e => setForm({ ...form, units: e.target.value })}
              />
              <button onClick={addStock}>Add</button>
            </div>

            <div className="stock-grid">
              {mergedStocks.map(s => (
                <div key={s._id} className={`stock-card ${isLow(s.units) ? "low" : ""}`}>
                  <h3>{s.bloodGroup}</h3>
                  <input
                    type="number"
                    value={s.units}
                    onChange={e => {
                      if (!s.isNew) handleStockChange(s._id, e.target.value);
                    }}
                    onBlur={e => {
                      if (!s.isNew) updateStock(s._id, e.target.value);
                    }}
                  />
                  {isLow(s.units) && <p className="warn">Low stock</p>}
                  {!s.isNew && (
                    <button className="del" onClick={() => deleteStock(s._id)}>
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {view === "requests" && (
          <>
            <h2>Pending Requests</h2>
            <div className="card">
              {requests
                .filter(r => r.status === "Pending")
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                .map(r => (
                  <div key={r._id} className="row">
                    <span>{r.userId?.username}</span>
                    <span>{r.bloodGroup}</span>
                    <span>{r.units}</span>
                    <button onClick={() => approve(r._id)}>Accept</button>
                    <button onClick={() => reject(r._id)}>Reject</button>
                  </div>
                ))}
            </div>
          </>
        )}

        {view === "history" && (
          <>
            <h2>History</h2>
            <div className="card">
              {requests.filter(r => r.status !== "Pending").map(r => (
                <div key={r._id} className="row">
                  <span>{r.userId?.username}</span>
                  <span>{r.bloodGroup}</span>
                  <span>{r.units}</span>
                  <span>{r.status}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {view === "users" && (
          <>
            <h2>Registered Users</h2>
            <div className="card">
              {users.map(u => {
                const banned = u.bannedUntil && new Date(u.bannedUntil) > new Date();
                return (
                  <div key={u._id} className="row">
                    <span>{u.username}</span>
                    <span>{u.email}</span>
                    <span>Cancel: {u.cancelCount || 0}</span>
                    <span>{banned ? "Banned" : "Active"}</span>
                    {u.cancelCount >= 3 && !banned && (
                      <button onClick={() => approveBan(u._id)}>Approve Ban</button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {view === "donors" && (
          <>
            <h2>Registered Donors</h2>
            <div className="card">
              {donors.map(d => (
                <div key={d._id} className="row">
                  <span>{d.username}</span>
                  <span>{d.bloodGroup}</span>
                  <span>{d.mobileNumber || "-"}</span>
                  <span>
                    {d.lastDonationDate
                      ? new Date(d.lastDonationDate).toLocaleDateString()
                      : "Never"}
                  </span>
                  <span>{isEligible(d.lastDonationDate) ? "Eligible" : "Not Eligible"}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
