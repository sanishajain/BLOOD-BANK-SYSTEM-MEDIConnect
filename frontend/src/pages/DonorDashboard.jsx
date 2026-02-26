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
  const [loading, setLoading] = useState(true);

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

  /* ---------------- AUTH CHECK ---------------- */
  useEffect(() => {
    if (!token) nav("/login/donor");
  }, [token, nav]);

  /* ---------------- LOADERS ---------------- */

  const loadAssigned = async () => {
    try {
      setLoading(true);
      const res = await api("/api/donors/assigned", "GET", null, token);
      setAssigned(Array.isArray(res) ? res : []);
    } catch {
      setAssigned([]);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await api("/api/donors/history", "GET", null, token);
      setHistory(Array.isArray(res) ? res : []);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      const res = await api("/api/donors/profile", "GET", null, token);
      if (res) setProfile(res);
    } catch {}
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

  /* ---------------- ACTIONS ---------------- */

  const accept = async (id) => {
    const res = await api(`/api/donors/accept/${id}`, "POST", null, token);
    if (res?.message) {
      setPopup({ show: true, msg: res.message });
      loadAssigned();
      loadProfile();
    }
  };

  const reject = async (id) => {
    const res = await api(`/api/donors/reject/${id}`, "POST", null, token);
    if (res?.message) {
      setPopup({ show: true, msg: res.message });
      loadAssigned();
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

  /* ---------------- ELIGIBILITY ---------------- */

  const today = new Date();
  const nextEligibleDate = profile?.nextDonationDate
    ? new Date(profile.nextDonationDate)
    : null;

  const isEligible =
    !nextEligibleDate || nextEligibleDate <= today;

  /* ---------------- UI ---------------- */

  return (
    <div className="donor-layout">
      <div className="sidebar">
        <h2>{profile.username || "Donor"}</h2>
        <button onClick={() => setView("assigned")}>Assigned Requests</button>
        <button onClick={() => setView("history")}>Donation History</button>
        <button onClick={() => setView("profile")}>Profile</button>
        <button className="logout" onClick={logout}>Logout</button>
      </div>

      <div className="main-content">

        {/* LOADING */}
        {loading && <p className="hint">Loading...</p>}

        {/* ASSIGNED */}
        {!loading && view === "assigned" && (
          <>
            <h2>Assigned Requests</h2>

            {assigned.length === 0 ? (
              <p className="hint">
                You currently have no assigned requests.
                <br />
                When a user selects you, it will appear here.
              </p>
            ) : (
              assigned.map(r => (
                <div key={r._id} className="row">
                  <span><b>Hospital:</b> {r.hospital || "N/A"}</span>
                  <span><b>Blood:</b> {r.bloodGroup}</span>
                  <span><b>Units:</b> {r.units}</span>
                  <span>
                    <b>Needed On:</b>{" "}
                    {r.requiredDate
                      ? new Date(r.requiredDate).toLocaleDateString()
                      : "—"}
                  </span>
                  <span><b>City:</b> {r.city}</span>

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
              ))
            )}
          </>
        )}

        {/* HISTORY */}
        {!loading && view === "history" && (
          <>
            <h2>Donation History</h2>

            {history.length === 0 ? (
              <p className="hint">
                No donation history yet.
                <br />
                Once you complete a donation, it will appear here.
              </p>
            ) : (
              history.map(h => (
                <div key={h._id} className="history-row">
                  <span>{h.hospital}</span>
                  <span>{h.bloodGroup}</span>
                  <span>{h.units} units</span>
                  <span>{h.status}</span>
                </div>
              ))
            )}
          </>
        )}

        {/* PROFILE */}
        {!loading && view === "profile" && (
          <>
            <h2>My Profile</h2>

            <div className="profile-card">

              {/* Eligibility Badge */}
              <div style={{ marginBottom: "15px" }}>
                <strong>Status: </strong>
                {isEligible ? (
                  <span style={{ color: "green", fontWeight: "bold" }}>
                    Eligible to Donate
                  </span>
                ) : (
                  <span style={{ color: "red", fontWeight: "bold" }}>
                    Not Eligible Until {nextEligibleDate.toLocaleDateString()}
                  </span>
                )}
              </div>

              <p>
                <b>Last Donation:</b>{" "}
                {profile.lastDonationDate
                  ? new Date(profile.lastDonationDate).toLocaleDateString()
                  : "Not donated yet"}
              </p>

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