import { useEffect, useState } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";
import "../css/user.css";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function UserDashboard() {
  const nav = useNavigate();
  const token = localStorage.getItem("token");

  const [view, setView] = useState("create");
  const [loading, setLoading] = useState(false);
  const [infoMsg, setInfoMsg] = useState("");
  const [openHistory, setOpenHistory] = useState(null);

  const [form, setForm] = useState({
    city: "",
    bloodGroup: "",
    units: "",
    hospital: "",
    requiredDate: "",
    patientName: "",
    contact: ""
  });

  const [stocks, setStocks] = useState([]);
  const [donors, setDonors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [stockUnits, setStockUnits] = useState({});

  /* ================= LOAD DATA ================= */

  const loadAll = async () => {
    try {
      const s = await api("/api/receivers/compatible-stock", "GET", null, token);
      const d = await api("/api/receivers/compatible-donors", "GET", null, token);
      const h = await api("/api/receivers/history", "GET", null, token);

      setStocks(Array.isArray(s) ? s : []);
      setDonors(Array.isArray(d) ? d : []);
      setRequests(Array.isArray(h) ? h : []);
    } catch (e) {
      console.log("Load error:", e);
    }
  };

  useEffect(() => {
    if (token) loadAll();
  }, [view]);

  /* ================= MAIN REQUEST ================= */

  const mainReq =
    requests
      .filter(r => r.requestType === "USER")
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;

  const activeChildReqs = mainReq
    ? requests.filter(
      r =>
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

  /* ================= CREATE REQUEST ================= */

  const sendRequest = async () => {
    const { bloodGroup, units, hospital, requiredDate, patientName, contact, city } = form;

    if (!bloodGroup || !units || !hospital || !requiredDate || !patientName || !contact || !city)
      return alert("Please fill all fields");

    if (loading) return;
    setLoading(true);

    try {
      await api(
        "/api/receivers/request-blood",
        "POST",
        {
          ...form,
          units: Number(units)
        },
        token
      );

      setForm({
        city: "",
        bloodGroup: "",
        units: "",
        hospital: "",
        requiredDate: "",
        patientName: "",
        contact: ""
      });

      setView("stock");
      setInfoMsg("Requirement created successfully");
      loadAll();
    } catch {
      alert("Error creating request");
    }

    setLoading(false);
  };

  /* ================= STOCK REQUEST ================= */

  const sendStockRequest = async stock => {
    const units = Number(stockUnits[stock._id]);

    if (!units || units <= 0) return alert("Enter valid units");
    if (units > remaining) return alert(`Only ${remaining} units remaining`);

    await api(
      "/api/receivers/request-from-stock",
      "POST",
      { stockId: stock._id, units },
      token
    );

    setStockUnits(p => ({ ...p, [stock._id]: "" }));
    setInfoMsg("Request sent to admin");
    loadAll();
  };

  /* ================= DONOR REQUEST ================= */

  const sendDonorRequest = async donor => {
    if (remaining === 0) return;

    await api(
      "/api/receivers/request-from-donor",
      "POST",
      { donorId: donor._id },
      token
    );

    setInfoMsg("Request sent to donor");
    loadAll();
  };

  /* ================= CANCEL ================= */

  const cancelRequest = async id => {
    const ok = window.confirm("Cancel this request?");
    if (!ok) return;

    await api(`/api/receivers/cancel/${id}`, "DELETE", null, token);
    loadAll();
  };

  const logout = () => {
    localStorage.clear();
    nav("/");
  };

  /* ================= UI ================= */

  return (
    <div className="user-layout">
      <div className="sidebar">
        <h2>User</h2>
        <button onClick={() => setView("create")}>Create Requirement</button>
        <button onClick={() => setView("stock")} disabled={!mainReq}>
          Stock & Donors
        </button>
        <button onClick={() => setView("history")}>History</button>
        <button className="logout" onClick={logout}>
          Logout
        </button>
      </div>

      <div className="main-content">
        {infoMsg && <p className="info">{infoMsg}</p>}

        {/* ================= CREATE ================= */}
        {view === "create" && (
          <div className="card">
            <h2>Create Blood Requirement</h2>

            <input
              placeholder="Patient Name"
              value={form.patientName}
              onChange={e =>
                setForm({ ...form, patientName: e.target.value })
              }
            />

            <input
              placeholder="Contact"
              value={form.contact}
              onChange={e => setForm({ ...form, contact: e.target.value })}
            />

            <select
              value={form.bloodGroup}
              onChange={e =>
                setForm({ ...form, bloodGroup: e.target.value })
              }
            >
              <option value="">Blood Group</option>
              {BLOOD_GROUPS.map(b => (
                <option key={b}>{b}</option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Units"
              value={form.units}
              onChange={e => setForm({ ...form, units: e.target.value })}
            />

            <input
              type="date"
              value={form.requiredDate}
              onChange={e =>
                setForm({ ...form, requiredDate: e.target.value })
              }
            />

            <input
              placeholder="Hospital"
              value={form.hospital}
              onChange={e => setForm({ ...form, hospital: e.target.value })}
            />

            <input
              placeholder="City"
              value={form.city}
              onChange={e => setForm({ ...form, city: e.target.value })}
            />

            <button disabled={loading} onClick={sendRequest}>
              {loading ? "Saving..." : "Save Requirement"}
            </button>
          </div>
        )}

        {/* ================= STOCK & DONORS ================= */}
        {view === "stock" && mainReq && (
          <>
            <div className="card highlight">
              <p><strong>Blood:</strong> {mainReq.bloodGroup}</p>
              <p><strong>Total Needed:</strong> {mainReq.units}</p>
              <p><strong>Requested:</strong> {requestedTotal}</p>
              <p><strong>Remaining:</strong> {remaining}</p>
            </div>

            <div className="card">
              <h2>Compatible Stock</h2>

              {stocks.map(stock => {
                const related = requests.filter(
                  r =>
                    String(r.stockId) === String(stock._id) &&
                    ["Pending", "Accepted"].includes(r.status)
                );

                const totalFromStock = related.reduce(
                  (sum, r) => sum + Number(r.units || 0),
                  0
                );

                const pendingReq = related.find(r => r.status === "Pending");

                return (
                  <div key={stock._id} className="row">
                    <span>{stock.bloodGroup}</span>
                    <span>{stock.units} units available</span>

                    {related.length > 0 ? (
                      <div className="stock-status">
                        <span>Requested: {totalFromStock} units</span>

                        {pendingReq ? (
                          <>
                            <span>Status: Pending</span>
                            <button
                              className="cancel-btn"
                              onClick={() => cancelRequest(pendingReq._id)}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <span className="accepted">Status: Accepted</span>
                        )}
                      </div>
                    ) : (
                      <>
                        <input
                          type="number"
                          placeholder="Units"
                          value={stockUnits[stock._id] || ""}
                          onChange={e =>
                            setStockUnits(prev => ({
                              ...prev,
                              [stock._id]: e.target.value
                            }))
                          }
                        />
                        <button onClick={() => sendStockRequest(stock)}>
                          Request
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="card">
              <h2>Compatible Donors</h2>
              {donors.map(donor => (
                <div key={donor._id} className="row">
                  <span>{donor.username}</span>
                  <span>{donor.bloodGroup}</span>
                  <button
                    disabled={remaining === 0}
                    onClick={() => sendDonorRequest(donor)}
                  >
                    Request
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ================= HISTORY ================= */}
        {view === "history" && (
          <div className="card">
            <h2>Request History</h2>

            {requests
              .filter(r => r.requestType === "USER")
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map(userReq => {
                const childRequests = requests.filter(
                  r => String(r.parentRequestId) === String(userReq._id)
                );

                return (
                  <div key={userReq._id} className="history-block">

                    <div className="history-main-row">
                      <div>{userReq.bloodGroup}</div>
                      <div>{userReq.units} units</div>
                      <div className={`badge ${(userReq.status || "").toLowerCase()}`}>
                        {userReq.status}
                      </div>
                      <div>
                        <strong>Required:</strong>{" "}
                        {userReq.neededDate
                          ? new Date(userReq.reachDate).toLocaleDateString()
                          : "-"}
                      </div>

                      <div>
                        {new Date(userReq.createdAt).toLocaleDateString()}
                      </div>
                      <button
                        onClick={() =>
                          setOpenHistory(
                            openHistory === userReq._id ? null : userReq._id
                          )
                        }
                      >
                        {openHistory === userReq._id
                          ? "Hide Details"
                          : "View Details"}
                      </button>
                    </div>

                    {openHistory === userReq._id && (
                      <div className="history-details">
                        {childRequests.map(child => (
                          <div key={child._id} className="detail-row">
                            <div>{child.requestType}</div>
                            <div>{child.units} units</div>
                            <div className={`badge ${(child.status || "").toLowerCase()}`}>
                              {child.status}
                            </div>
                          
                            {child.status === "Pending" && (
                              <button
                                className="cancel-btn"
                                onClick={() => cancelRequest(child._id)}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                );
              })}
          </div>
        )}

      </div>
    </div>
  );
}
