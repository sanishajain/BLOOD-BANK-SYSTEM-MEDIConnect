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
 const [form, setForm] = useState({
  username: "",
  email: "",
  password: "",
  mobileNumber: "",
  address: "",
  age: "",
  city: "",

  // receiver-only
  bloodGroupNeeded: "",
  unitsNeeded: "",
  hospital: "",
  hospitalAddress: ""
});


  const [stocks, setStocks] = useState([]);
  const [donors, setDonors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [stockUnits, setStockUnits] = useState({});
  const [openHistory, setOpenHistory] = useState(null);
  const [infoMsg, setInfoMsg] = useState("");
  const [loading, setLoading] = useState(false);

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

  const mainReq =
    requests
      .filter(r => r.requestType === "USER")
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;

  const adminReqs = mainReq
    ? requests.filter(r => r.requestType === "ADMIN" && String(r.parentRequestId) === String(mainReq._id))
    : [];

  const requestedFromAdmin = adminReqs.reduce((s, r) => s + r.units, 0);
  const remaining = mainReq ? Math.max(mainReq.units - requestedFromAdmin, 0) : 0;

  const sendRequest = async () => {
    const { bloodGroup, units, hospital, neededDate, patientName, contact, city } = form;
    if (!bloodGroup || !units || !hospital || !neededDate || !patientName || !contact || !city)
      return alert("Fill all fields including city");

    if (loading) return;
    setLoading(true);

    await api("/api/receivers/request-blood", "POST", { ...form, units: Number(units) }, token);
    setForm({ bloodGroup: "", units: "", hospital: "", neededDate: "", patientName: "", contact: "" });
    setView("stock");
    setLoading(false);
    loadAll();
  };

  const pendingStock = id =>
    requests.find(r => String(r.stockId) === String(id) && r.status === "Pending");

  const pendingDonor = id =>
    requests.find(r => String(r.donorId) === String(id) && r.status === "Pending");

  const sendStockRequest = async (stock) => {
    const units = Number(stockUnits[stock._id]);
    if (!units || units <= 0) return alert("Enter valid units");
    if (units > remaining) return alert(`Only ${remaining} units left`);
    if (pendingStock(stock._id)) return;

    await api("/api/receivers/request-from-stock", "POST", {
      stockId: stock._id,
      bloodGroup: stock.bloodGroup,
      units
    }, token);

    setInfoMsg("Request sent to admin. Waiting for approval...");
    setStockUnits(p => ({ ...p, [stock._id]: "" }));
    loadAll();
  };

  const sendDonorRequest = async (donor) => {
    if (remaining === 0) return;
    if (pendingDonor(donor._id)) return;

    await api("/api/receivers/request-from-donor", "POST", {
      donorId: donor._id,
      bloodGroup: donor.bloodGroup,
      units: 1
    }, token);

    setInfoMsg("Request sent to donor. Waiting for response...");
    loadAll();
  };

  const cancelRequest = async (id) => {
    const ok = window.confirm(
      "Canceling too many times will ban you for 3 months.\n\nDo you still want to cancel?"
    );
    if (!ok) return;

    try {
      const res = await api(`/api/receivers/cancel/${id}`, "DELETE", null, token);
      alert(res.message);
      loadAll();
    } catch (e) {
      alert(e.message || "Cannot cancel now");
    }
  };

  const logout = () => {
    localStorage.clear();
    nav("/");
  };
  const formatPhone = (phone) => {
    if (!phone) return "";
    let p = phone.toString().replace(/\D/g, "");
    if (p.length === 10) p = "91" + p; // India default
    return "+" + p;
  };

  return (
    <div className="user-layout">
      <div className="sidebar">
        <h2>User</h2>
        <button onClick={() => setView("create")}>Create Requirement</button>
        <button onClick={() => setView("stock")} disabled={!mainReq}>Stock & Donors</button>
        <button onClick={() => setView("history")}>History</button>
        <button className="logout" onClick={logout}>Logout</button>
      </div>

      <div className="main-content">
        {infoMsg && <p className="info">{infoMsg}</p>}

        {/* CREATE */}
        {view === "create" && (
          <div className="card">
            <h2>Create Blood Requirement</h2>
            <input placeholder="Patient Name" value={form.patientName}
              onChange={e => setForm({ ...form, patientName: e.target.value })} />
            <input placeholder="Contact" value={form.contact}
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
            <input placeholder="City" value={form.city || ""}
              onChange={e => setForm({ ...form, city: e.target.value })}
            />

            <button disabled={loading} onClick={sendRequest}>
              {loading ? "Saving..." : "Save Requirement"}
            </button>
          </div>
        )}

        {/* STOCK & DONORS */}
        {view === "stock" && mainReq && (
          <>
            <div className="card highlight">
              <p>Blood: {mainReq.bloodGroup}</p>
              <p>Total Needed: {mainReq.units}</p>
              <p>Requested: {requestedFromAdmin}</p>
              <p>Remaining: {remaining}</p>
            </div>

            <div className="card">
              <h2>Compatible Stock</h2>
              {stocks.map(s => {
                const p = pendingStock(s._id);
                return (
                  <div key={s._id} className="row">
                    <span>{s.bloodGroup}</span>
                    <span>{s.units} units</span>
                    <input type="number"
                      disabled={!!p || remaining === 0}
                      value={stockUnits[s._id] || ""}
                      onChange={e => setStockUnits(x => ({ ...x, [s._id]: e.target.value }))} />
                    {p ? (
                      <>
                        <button disabled>Pending</button>
                        <button onClick={() => cancelRequest(p._id)}>Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => sendStockRequest(s)}>Request</button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="card">
              <h2>Compatible Donors</h2>
              {donors.map(d => {
                const p = pendingDonor(d._id);
                return (
                  <div key={d._id} className="row">
                    <span>{d.username}</span>
                    <span>{d.bloodGroup}</span>
                    {p ? (
                      <>
                        <button disabled>Pending</button>
                        <button onClick={() => cancelRequest(p._id)}>Cancel</button>
                      </>
                    ) : (
                      <button disabled={remaining === 0} onClick={() => sendDonorRequest(d)}>Request</button>
                    )}
                    {p?.status === "Accepted" && (
                      <span><a href={`tel:${d.mobileNumber}`}>Call</a></span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* HISTORY */}
        {view === "history" && (
          <div className="card">
            <h2>Request History</h2>
            {requests.filter(r => r.requestType === "USER").map(u => (
              <div key={u._id} className="history-block">
                <div className="row">
                  <span>{u.bloodGroup}</span>
                  <span>{u.units}</span>
                  <span>{u.status}</span>
                  <button onClick={() => setOpenHistory(p => (p === u._id ? null : u._id))}>
                    {openHistory === u._id ? "Hide" : "View"}
                  </button>
                </div>

                {openHistory === u._id && (
                  <div className="history-details">
                    {requests
                      .filter(r => r._id === u._id || String(r.parentRequestId) === String(u._id))
                      .map(r => (
                        <div key={r._id} className="detail-row">
                          <span>Type: {r.requestType} </span>

                          <span>Units: {r.units} </span>
                          <span>Type: {r.bloodGroup} </span>
                          <span>Status: {r.status} </span>
                          <span>Status: {r.status} </span>

                          {r.status === "Accepted" && r.requestType === "DONOR" && (
                            <div className="contact-box">
                              <p><b>Donor:</b> {r.donorContact?.name || "N/A"} </p>

                              {r.donorContact?.phone && (
                                <div className="contact-actions">
                                  <a
                                    href={`tel:${formatPhone(r.donorContact.mobileNumber)}`}
                                    className="call-btn"
                                  >
                                    📞 Call Donor
                                  </a>

                                  <a
                                    href={`https://wa.me/${formatPhone(r.donorContact.phone).replace("+", "")}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="wa-btn"
                                  >
                                    💬 WhatsApp Donor
                                  </a>
                                </div>
                              )}

                              <hr />

                              <p><b>Requester:</b> {r.userContact?.name || "You"}</p>

                              {r.userContact?.phone && (
                                <div className="contact-actions">
                                  <a
                                    href={`tel:${formatPhone(r.userContact.phone)}`}
                                    className="call-btn"
                                  >
                                    📞 Call Requester
                                  </a>

                                  <a
                                    href={`https://wa.me/${formatPhone(r.userContact.phone).replace("+", "")}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="wa-btn"
                                  >
                                    💬 WhatsApp Requester
                                  </a>
                                </div>
                              )}
                            </div>
                          )}


                          <span>
                            Arrival: {r.reachDate ? new Date(r.reachDate).toDateString() : "Not confirmed"}
                          </span>
                          {r.status === "Pending" && (
                            <button
                              className="cancel-btn"
                              onClick={() => cancelRequest(r._id)}
                            >
                              Cancel
                            </button>
                          )}

                        </div>
                      ))}
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
