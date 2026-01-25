import { useEffect, useState } from "react";
import { api } from "../api";
import "../css/donor.css";
import { useNavigate } from "react-router-dom";

export default function DonorDashboard() {
  const nav = useNavigate();
  const token = localStorage.getItem("token");

  const [view, setView] = useState("assigned");

  const [assigned, setAssigned] = useState([]);
  const [history, setHistory] = useState([]);
  const [profile, setProfile] = useState({
    username: "",
    bloodGroup: "",
    mobileNumber: "",
    city: "",
    lastDonationDate: null,
    nextDonationDate: null,
  });

  const [editMode, setEditMode] = useState(false);
  const [popup, setPopup] = useState({ show: false, msg: "" });

  useEffect(() => {
    if (!token) nav("/login/donor");
  }, [token, nav]);

  /* ---------- LOADERS ---------- */

  const loadAssigned = async () => {
    try {
      const res = await api("/api/donors/assigned", "GET", null, token);
      setAssigned(Array.isArray(res) ? res : []);
    } catch {
      setAssigned([]);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api("/api/donors/history", "GET", null, token);
      setHistory(Array.isArray(res) ? res : []);
    } catch {
      setHistory([]);
    }
  };

  const loadProfile = async () => {
    try {
      const res = await api("/api/donors/profile", "GET", null, token);
      if (res) {
        setProfile({
          username: res.username || "",
          bloodGroup: res.bloodGroup || "",
          mobileNumber: res.mobileNumber || "",
          city: res.city || "",
          lastDonationDate: res.lastDonationDate || null,
          nextDonationDate: res.nextDonationDate || null,
        });
      }
    } catch { }
  };

  useEffect(() => {
    loadAssigned();
    loadHistory();
    loadProfile();
  }, []);

  useEffect(() => {
    if (view === "assigned") loadAssigned();
    if (view === "history") loadHistory();
    if (view === "profile") loadProfile();
  }, [view]);

  /* ---------- ACTIONS ---------- */

  const accept = async (id) => {
    const res = await api(`/api/donors/accept/${id}`, "POST", null, token);
    if (res?.message) {
      setPopup({ show: true, msg: res.message });
      setView("assigned");  // ✅ auto switch to assigned
      loadAssigned();       // ✅ refresh list
      loadProfile();
    }
  };

  const reject = async (id) => {
    const res = await api(`/api/donors/reject/${id}`, "POST", null, token);
    if (res?.message) {
      setPopup({ show: true, msg: res.message });
      setView("assigned");  // ✅ auto switch to assigned
      loadAssigned();       // ✅ refresh list
      loadProfile();
    }
  };

  const saveProfile = async () => {
    const res = await api(
      "/api/donors/profile",
      "PUT",
      {
        username: profile.username,
        mobileNumber: profile.mobileNumber,
        city: profile.city,
      },
      token
    );

    if (res?.message) {
      setPopup({ show: true, msg: res.message });
      setEditMode(false);
      loadProfile();
    }
  };

  const logout = () => {
    localStorage.clear();
    nav("/");
  };

  /* ---------- ELIGIBILITY ---------- */

  const today = new Date();
  const nextEligibleDate = profile.nextDonationDate
    ? new Date(profile.nextDonationDate)
    : null;

  const isEligible =
    !nextEligibleDate || nextEligibleDate <= today;

  /* ---------- UI ---------- */

  return (
    <div className="donor-layout">
      <div className="sidebar">
        <h2>Donor</h2>
        <button onClick={() => setView("assigned")}>Assigned Requests</button>
        <button onClick={() => setView("history")}>Donation History</button>
        <button onClick={() => setView("profile")}>Profile</button>
        <button className="logout" onClick={logout}>Logout</button>
      </div>

      <div className="main-content">

        {/* ASSIGNED */}
        {view === "assigned" && (
          <>
            <h2>Assigned Requests</h2>
            <div className="card">
              {assigned.length === 0 && <p className="hint">No assigned requests.</p>}
              {assigned.map(r => (
                <div key={r._id} className="row">
                  <span>{r.hospital || "Hospital"}</span>
                  <span>{r.bloodGroup}</span>
                  <span>{r.units} units</span>
                  <span>Needed on: {new Date(r.neededDate).toLocaleDateString()}</span>
                  <span>city: {r.city}</span>

                  {r.status === "Pending" && (
                    <>
                      <button onClick={() => accept(r._id)}>Accept</button>
                      <button className="danger" onClick={() => reject(r._id)}>Reject</button>
                    </>
                  )}

                  {r.status === "Accepted" && (
                    <span className="status accepted">Accepted</span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* HISTORY */}
        {view === "history" && (
          <>
            <h2>Donation History</h2>
            <div className="card">
              {history.length === 0 && <p className="hint">No donation history yet.</p>}
              {history.map(h => (
                <div key={h._id} className="history-row">
                  <div className="history-section">
                    <b>Hospital</b>
                    <span>{h.hospital || "N/A"}</span>
                  </div>
                  <div className="history-section">
                    <b>Blood Group</b>
                    <span>{h.bloodGroup}</span>
                  </div>
                  <div className="history-section">
                    <b>Units</b>
                    <span>{h.units}</span>
                  </div>
                  <div className="history-section">
                    <b>Status</b>
                    <span className={`status ${h.status?.toLowerCase()}`}>
                      {h.status}
                    </span>
                  </div>
                  <div className="history-section">
                    <b>Requested By</b>
                    <span>{h.requestedBy?.name || "N/A"}</span>
                    <small>{h.requestedBy?.phone || ""}</small>
                  </div>
                  <div className="history-section">
                    <b>Needed Date</b>
                    <span>
                      {h.neededDate
                        ? new Date(h.neededDate).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                  <div className="history-section">
                    <b>Donation Date</b>
                    <span>
                      {h.reachDate
                        ? new Date(h.reachDate).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* PROFILE */}
        {view === "profile" && (
          <>
            <h2>My Profile</h2>
            <div className="profile-card">
              <p>
                <b>Last Donation:</b>{" "}
                {profile.lastDonationDate
                  ? new Date(profile.lastDonationDate).toLocaleDateString()
                  : "Not donated yet"}
              </p>

              <p>
                <b>Next Eligible Date:</b>{" "}
                {nextEligibleDate
                  ? nextEligibleDate.toLocaleDateString()
                  : "Eligible now"}
              </p>

              {!isEligible && (
                <p style={{ color: "red" }}>
                  Not eligible until {nextEligibleDate.toLocaleDateString()}
                </p>
              )}

              {!editMode ? (
                <>
                  <p><b>Name:</b> {profile.username}</p>
                  <p><b>Blood Group:</b> {profile.bloodGroup}</p>
                  <p><b>Phone:</b> {profile.mobileNumber}</p>
                  <p><b>City:</b> {profile.city}</p>
                  <button onClick={() => setEditMode(true)}>Edit</button>
                </>
              ) : (
                <>
                  <input
                    value={profile.username}
                    onChange={e => setProfile({ ...profile, username: e.target.value })}
                  />
                  <input disabled value={profile.bloodGroup} />
                  <input
                    value={profile.mobileNumber}
                    onChange={e => setProfile({ ...profile, mobileNumber: e.target.value })}
                  />
                  <input
                    value={profile.city}
                    onChange={e => setProfile({ ...profile, city: e.target.value })}
                  />
                  <button onClick={saveProfile}>Save</button>
                  <button className="danger" onClick={() => setEditMode(false)}>Cancel</button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* POPUP */}
      {popup.show && (
        <div className="popup">
          <div className="popup-inner">
            <p>{popup.msg}</p>
            <button onClick={() => setPopup({ show: false, msg: "" })}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
