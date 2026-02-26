import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";
import "../css/user.css";
import { jwtDecode } from "jwt-decode";
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function UserDashboard() {
  const nav = useNavigate();
  const token = localStorage.getItem("token");

  const [view, setView] = useState("create");
  const [loading, setLoading] = useState(false);
  const [infoMsg, setInfoMsg] = useState("");
  const [openHistory, setOpenHistory] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [receiverName, setReceiverName] = useState("");

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

  /* ================= TOKEN CHECK ================= */

  useEffect(() => {
  if (!token) {
    nav("/");
  } else {
    try {
      const decoded = jwtDecode(token);
      console.log("DECODED TOKEN:", decoded);
      setReceiverName(decoded.username || decoded.name || decoded.user?.username || "");
    } catch (err) {
      console.error("Invalid token");
    }
  }
}, [token, nav]);
  /* ================= AUTO CLEAR MESSAGE ================= */

  useEffect(() => {
    if (!infoMsg) return;
    const t = setTimeout(() => setInfoMsg(""), 3000);
    return () => clearTimeout(t);
  }, [infoMsg]);

  /* ================= LOAD DATA ================= */

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);

      const historyRes = await api("/api/receivers/history", "GET", null, token);
      const historyData = Array.isArray(historyRes?.requests)
        ? historyRes.requests
        : Array.isArray(historyRes)
          ? historyRes
          : [];

      setRequests(historyData);

      if (view === "stock") {
        const stockRes = await api("/api/receivers/compatible-stock", "GET", null, token);
        const donorRes = await api("/api/receivers/compatible-donors", "GET", null, token);

        setStocks(stockRes?.stocks || stockRes || []);
        setDonors(donorRes?.donors || donorRes || []);
      }
    } catch (err) {
      console.error(err);
      setInfoMsg("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [token, view]);

  useEffect(() => {
    if (token) loadAll();
  }, [token, view, loadAll]);

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
    ? Math.max(Number(mainReq.units || 0) - requestedTotal, 0)
    : 0;

  /* ================= SAME CITY PRIORITY ================= */

  const sortedDonors = useMemo(() => {
    if (!mainReq) return donors;

    const sameCity = [];
    const otherCity = [];

    donors.forEach(d => {
      if (
        d.city &&
        mainReq.city &&
        d.city.toLowerCase() === mainReq.city.toLowerCase()
      ) {
        sameCity.push(d);
      } else {
        otherCity.push(d);
      }
    });

    return [...sameCity, ...otherCity];
  }, [donors, mainReq]);

  /* ================= CREATE REQUEST ================= */

  const sendRequest = async () => {
    const { bloodGroup, units, hospital, requiredDate, patientName, contact, city } = form;

    if (!bloodGroup || !units || !hospital || !requiredDate || !patientName || !contact || !city)
      return alert("Please fill all fields");

    if (Number(units) <= 0) return alert("Units must be greater than 0");

    try {
      setLoading(true);

      await api(
        "/api/receivers/request-blood",
        "POST",
        { ...form, units: Number(units) },
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
    } catch (err) {
      console.error(err);
      alert("Error creating request");
    } finally {
      setLoading(false);
    }
  };

  /* ================= STOCK REQUEST ================= */

  const sendStockRequest = async stock => {
    const units = Number(stockUnits[stock._id]);

    if (!units || units <= 0) return alert("Enter valid units");
    if (units > remaining) return alert(`Only ${remaining} units remaining`);

    try {
      setProcessingId(stock._id);

      await api(
        "/api/receivers/request-from-stock",
        "POST",
        { stockId: stock._id, units },
        token
      );

      setStockUnits(prev => ({ ...prev, [stock._id]: "" }));
      setInfoMsg("Request sent to admin");
      loadAll();
    } catch (err) {
      console.error(err);
      alert("Stock request failed");
    } finally {
      setProcessingId(null);
    }
  };

  /* ================= DONOR REQUEST ================= */

  const sendDonorRequest = async donor => {
    if (remaining <= 0) return;

    try {
      setProcessingId(donor._id);

      await api(
        "/api/receivers/request-from-donor",
        "POST",
        { donorId: donor._id },
        token
      );

      setInfoMsg("Request sent to donor");
      loadAll();
    } catch (err) {
      console.error(err);
      alert("Donor request failed");
    } finally {
      setProcessingId(null);
    }
  };

  /* ================= CANCEL ================= */

  const cancelRequest = async id => {
    if (!window.confirm("Cancel this request?")) return;

    try {
      await api(`/api/receivers/cancel/${id}`, "DELETE", null, token);
      setInfoMsg("Request cancelled");
      loadAll();
    } catch (err) {
      console.error(err);
      alert("Cancel failed");
    }
  };

  const logout = () => {
    localStorage.clear();
    nav("/");
  };

  /* ================= UI ================= */

  return (
    <div className="user-layout">
      <div className="sidebar">
        <h2>{receiverName ? `${receiverName}` : "Dashboard"}</h2>
        <button onClick={() => setView("create")}>Create Requirement</button>
        <button onClick={() => setView("stock")} disabled={!mainReq}>
          Stock & Donors
        </button>
        <button onClick={() => setView("history")}>History</button>
        <button className="logout" onClick={logout}>Logout</button>
      </div>

      <div className="main-content">
        {loading && <p className="info">Loading...</p>}
        {infoMsg && <p className="info success">{infoMsg}</p>}

        {/* CREATE VIEW */}
        {view === "create" && (
          <div className="card">
            <h2>Create Blood Requirement</h2>
            <input placeholder="Patient Name"
              value={form.patientName}
              onChange={e => setForm({ ...form, patientName: e.target.value })}
            />
            <input placeholder="Contact"
              value={form.contact}
              onChange={e => setForm({ ...form, contact: e.target.value })}
            />
            <select value={form.bloodGroup}
              onChange={e => setForm({ ...form, bloodGroup: e.target.value })}
            >
              <option value="">Blood Group</option>
              {BLOOD_GROUPS.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <input type="number" min="1" placeholder="Units"
              value={form.units}
              onChange={e => setForm({ ...form, units: e.target.value })}
            />
            <input type="date"
              value={form.requiredDate}
              onChange={e => setForm({ ...form, requiredDate: e.target.value })}
            />
            <input placeholder="Hospital"
              value={form.hospital}
              onChange={e => setForm({ ...form, hospital: e.target.value })}
            />
            <input placeholder="City"
              value={form.city}
              onChange={e => setForm({ ...form, city: e.target.value })}
            />
            <button disabled={loading} onClick={sendRequest}>
              {loading ? "Saving..." : "Save Requirement"}
            </button>
          </div>
        )}

        {/* STOCK & DONOR VIEW */}
        {view === "stock" && mainReq && (
          <div className="card">
            <h2>Stock & Donors</h2>

            <p>
              <strong>Blood Group Needed:</strong> {mainReq.bloodGroup} <br />
              <strong>Required:</strong> {mainReq.units} |{" "}
              <strong>Requested:</strong> {requestedTotal} |{" "}
              <strong>Remaining:</strong> {remaining}
            </p>

            <h3>Available Stock</h3>
            {stocks.length === 0 && <p>No stock available</p>}

            {stocks.map(stock => (
              <div key={stock._id} className="stock-row">
                <span>{stock.bloodGroup}</span>
                <span>{stock.units} units</span>
                <input type="number" min="1"
                  placeholder="Units"
                  value={stockUnits[stock._id] || ""}
                  onChange={e =>
                    setStockUnits(prev => ({
                      ...prev,
                      [stock._id]: e.target.value
                    }))
                  }
                />
                <button
                  disabled={remaining <= 0 || processingId === stock._id}
                  onClick={() => sendStockRequest(stock)}
                >
                  {processingId === stock._id ? "Sending..." : "Request"}
                </button>
              </div>
            ))}

            <h3>Available Donors</h3>
            {sortedDonors.length === 0 && <p>No donors available</p>}

            {sortedDonors.map(donor => {
              const isSameCity =
                donor.city &&
                mainReq.city &&
                donor.city.toLowerCase() === mainReq.city.toLowerCase();

              return (
                <div
                  key={donor._id}
                  className={`donor-row ${isSameCity ? "highlight" : ""}`}
                >
                  <span>{donor.username}</span>
                  <span>{donor.bloodGroup}</span>
                  <span>{donor.city}</span>

                  <button
                    disabled={remaining <= 0 || processingId === donor._id}
                    onClick={() => sendDonorRequest(donor)}
                  >
                    {processingId === donor._id ? "Sending..." : "Request Donor"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* HISTORY VIEW */}
        {/* ===================== HISTORY VIEW ===================== */}
        {view === "history" && (
          <div className="card">
            <h2 className="history-title">Request History</h2>

            {requests
              .filter(r => r.requestType === "USER")
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map(userReq => {

                const childRequests = requests.filter(
                  r => String(r.parentRequestId) === String(userReq._id)
                );

                return (
                  <div key={userReq._id} className="history-block">

                    {/* MAIN ROW */}
                    <div className="history-main-row">

                      <div className="history-col">
                        <span>Blood</span>
                        <p>{userReq.bloodGroup}</p>
                      </div>

                      <div className="history-col">
                        <span>Units</span>
                        <p>{userReq.units}</p>
                      </div>

                      <div className="history-col">
                        <span>Status</span>
                        <div className={`badge ${(userReq.status || "").toLowerCase()}`}>
                          {userReq.status}
                        </div>
                      </div>

                      <div className="history-col">
                        <span>Date</span>
                        <p>
                          {userReq.requiredDate
                            ? new Date(userReq.requiredDate).toLocaleDateString()
                            : "-"}
                        </p>
                      </div>

                      <button
                        className="details-btn"
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

                    {/* CHILD REQUESTS */}
                    {openHistory === userReq._id && (
                      <div className="history-details">

                        {childRequests.length === 0 && (
                          <div className="no-child">No responses yet.</div>
                        )}

                        {childRequests.map(child => (
                          <div key={child._id} className="detail-row">

                            <div className="detail-type">
                              {child.requestType}
                            </div>

                            <div>{child.units} Unit</div>

                            <div className={`badge ${(child.status || "").toLowerCase()}`}>
                              {child.status}
                            </div>

                            {/* CANCEL BUTTON */}
                            {child.status === "Pending" && (
                              <button
                                className="cancel-btn"
                                onClick={() => cancelRequest(child._id)}
                              >
                                Cancel
                              </button>
                            )}

                            {/* ================= ACCEPTED CONTACT ================= */}
                            {child.status === "Accepted" && child.donorId && (
                              <div className="accepted-contact-card">
                                <div className="accepted-contact-info">
                                  <span>Donor Name: {child.donorId.username || "Not Available"}</span>
                                  <span>Blood Group: {child.donorId.bloodGroup}</span>
                                  {/* <span>City: {child.donorId.city || "Not Provided"}</span> */}
                                  <span>Mobile: {child.donorId.mobileNumber}</span>
                                </div>

                                <div className="accepted-contact-actions">
                                  <a href={`tel:${child.donorId.mobileNumber}`}>
                                    <button className="call-btn">Call</button>
                                  </a>

                                  <a
                                    href={`https://wa.me/91${child.donorId.mobileNumber}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <button className="whatsapp-btn">WhatsApp</button>
                                  </a>
                                </div>
                              </div>
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