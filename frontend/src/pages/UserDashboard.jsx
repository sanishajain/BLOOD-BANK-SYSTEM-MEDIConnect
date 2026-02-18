// src/pages/UserDashboard.jsx
import { useEffect, useState } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";
import "../css/user.css";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function UserDashboard() {
  const nav = useNavigate();
  const token = localStorage.getItem("token");

  const [view, setView] = useState("create");
  const [openHistory, setOpenHistory] = useState(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    city: "",
    bloodGroup: "",
    units: "",
    hospital: "",
    neededDate: "",
    patientName: "",
    contact: ""
  });

  const [stocks, setStocks] = useState([]);
  const [donors, setDonors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [stockUnits, setStockUnits] = useState({});

  // ================= LOAD =================
  const loadAll = async () => {
    try {
      const s = await api("/api/receivers/compatible-stock", "GET", null, token);
      const d = await api("/api/receivers/compatible-donors", "GET", null, token);
      const h = await api("/api/receivers/history", "GET", null, token);

      setStocks(Array.isArray(s) ? s : []);
      setDonors(Array.isArray(d) ? d : []);
      setRequests(Array.isArray(h) ? h : []);
    } catch (e) {
      console.log("Load error", e);
    }
  };

  useEffect(() => {
    loadAll();
  }, [view]);

  // ================= MAIN USER REQUEST =================
  const mainReq =
    requests
      .filter(r => r.requestType === "USER")
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;

  const activeChildReqs = mainReq
    ? requests.filter(r =>
        ["ADMIN", "DONOR"].includes(r.requestType) &&
        String(r.parentRequestId) === String(mainReq._id) &&
        ["Pending", "Accepted"].includes(r.status)
      )
    : [];

  const requestedTotal = activeChildReqs.reduce(
    (sum, r) => sum + Number(r.units || 0),
    0
  );

  const remaining = mainReq
    ? Math.max(Number(mainReq.units) - requestedTotal, 0)
    : 0;

  // ================= CREATE =================
  const sendRequest = async () => {
    const { bloodGroup, units, hospital, neededDate, patientName, contact, city } = form;

    if (!bloodGroup || !units || !hospital || !neededDate || !patientName || !contact || !city)
      return alert("Fill all fields");

    if (loading) return;
    setLoading(true);

    await api("/api/receivers/request-blood", "POST", {
      ...form,
      units: Number(units)
    }, token);

    setForm({
      city: "",
      bloodGroup: "",
      units: "",
      hospital: "",
      neededDate: "",
      patientName: "",
      contact: ""
    });

    setView("stock");
    setLoading(false);
    loadAll();
  };

  // ================= STOCK REQUEST =================
  const sendStockRequest = async (stock) => {
    const units = Number(stockUnits[stock._id]);
    if (!units || units <= 0) return alert("Enter valid units");
    if (units > remaining) return alert(`Only ${remaining} units remaining`);

    await api("/api/receivers/request-from-stock", "POST", {
      stockId: stock._id,
      bloodGroup: stock.bloodGroup,
      units
    }, token);

    setStockUnits(p => ({ ...p, [stock._id]: "" }));
    loadAll();
  };

  // ================= DONOR REQUEST =================
  const sendDonorRequest = async (donor) => {
    if (remaining === 0) return alert("No units remaining");

    await api("/api/receivers/request-from-donor", "POST", {
      donorId: donor._id,
      bloodGroup: donor.bloodGroup,
      units: 1
    }, token);

    loadAll();
  };

  const cancelRequest = async (id) => {
    if (!window.confirm("Cancel this request?")) return;
    await api(`/api/receivers/cancel/${id}`, "DELETE", null, token);
    loadAll();
  };

  const logout = () => {
    localStorage.clear();
    nav("/");
  };

  // ================= UI =================
  return (
    <div className="user-layout">
      <div className="sidebar">
        <h2>User</h2>
        <button onClick={() => setView("create")}>Create Requirement</button>
        <button onClick={() => setView("stock")} disabled={!mainReq}>
          Stock & Donors
        </button>
        <button onClick={() => setView("history")}>History</button>
        <button className="logout" onClick={logout}>Logout</button>
      </div>

      <div className="main-content">

        {/* CREATE */}
        {view === "create" && (
          <div className="card">
            <h2>Create Blood Requirement</h2>

            <input placeholder="Patient Name"
              value={form.patientName}
              onChange={e => setForm({ ...form, patientName: e.target.value })} />

            <input placeholder="Contact"
              value={form.contact}
              onChange={e => setForm({ ...form, contact: e.target.value })} />

            <select value={form.bloodGroup}
              onChange={e => setForm({ ...form, bloodGroup: e.target.value })}>
              <option value="">Blood Group</option>
              {BLOOD_GROUPS.map(b => <option key={b}>{b}</option>)}
            </select>

            <input type="number" placeholder="Units"
              value={form.units}
              onChange={e => setForm({ ...form, units: e.target.value })} />

            <input type="date"
              value={form.neededDate}
              onChange={e => setForm({ ...form, neededDate: e.target.value })} />

            <input placeholder="Hospital"
              value={form.hospital}
              onChange={e => setForm({ ...form, hospital: e.target.value })} />

            <input placeholder="City"
              value={form.city}
              onChange={e => setForm({ ...form, city: e.target.value })} />

            <button disabled={loading} onClick={sendRequest}>
              {loading ? "Saving..." : "Save Requirement"}
            </button>
          </div>
        )}

        {/* STOCK & DONORS */}
        {view === "stock" && mainReq && (
          <div className="card">
            <h2>Stock & Donors</h2>

            <div className="summary">
              <p><b>Blood Group:</b> {mainReq.bloodGroup}</p>
              <p><b>Total Needed:</b> {mainReq.units}</p>
              <p><b>Requested:</b> {requestedTotal}</p>
              <p><b>Remaining:</b> {remaining}</p>
            </div>

            <h3>Available Stock</h3>
            {stocks.map(stock => (
              <div key={stock._id} className="stock-item">
                <div>
                  {stock.bloodGroup} • {stock.units} Units
                </div>

                <input
                  type="number"
                  placeholder="Units"
                  value={stockUnits[stock._id] || ""}
                  onChange={e =>
                    setStockUnits(p => ({
                      ...p,
                      [stock._id]: e.target.value
                    }))
                  }
                />

                <button onClick={() => sendStockRequest(stock)}>
                  Request
                </button>
              </div>
            ))}

            <h3>Available Donors</h3>
            {donors.map(donor => (
              <div key={donor._id} className="donor-item">
                <div>
                  {donor.name} • {donor.bloodGroup}
                </div>
                <button onClick={() => sendDonorRequest(donor)}>
                  Request 1 Unit
                </button>
              </div>
            ))}
          </div>
        )}

        {/* HISTORY */}
        {view === "history" && (
          <div className="card">
            <h2>Request History</h2>

            {requests
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map(r => (
                <div key={r._id} className="history-item">

                  <div
                    className="history-header"
                    onClick={() =>
                      setOpenHistory(openHistory === r._id ? null : r._id)
                    }
                  >
                    <div>
                      <strong>{r.bloodGroup}</strong> • {r.units} Units
                    </div>

                    <div className={`status ${r.status}`}>
                      {r.status}
                    </div>
                  </div>

                  {openHistory === r._id && (
                    <div className="history-details">
                      <p><b>Type:</b> {r.requestType}</p>
                      <p><b>Blood Group:</b> {r.bloodGroup}</p>
                      <p><b>Units:</b> {r.units}</p>
                      <p><b>Status:</b> {r.status}</p>
                      <p><b>Date:</b> {new Date(r.createdAt).toLocaleString()}</p>

                      {r.status === "Pending" && (
                        <button
                          className="cancel-btn"
                          onClick={() => cancelRequest(r._id)}
                        >
                          Cancel Request
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

      </div>
    </div>
  );
}
