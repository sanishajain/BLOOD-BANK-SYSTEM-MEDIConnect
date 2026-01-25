import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { api } from "../api";
import "../css/register.css";

export default function Register() {
  const { role } = useParams();
  const nav = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    mobileNumber: "",
    address: "",
    age: "",
    bloodGroup: "",
    lastDonationDate: "",
    city: ""
  });

  const register = async () => {
    try {
      await api(`/api/auth/register/${role}`, "POST", form);
      nav("/login/" + role);
    } catch (e) {
      alert("Registration failed");
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-left">
          <h1>Join Us</h1>
          <p>
            Register as a <b>{role}</b> and start using the app.
          </p>
        </div>

        <div className="register-right">
          <div className="card">
            <h2>{role.toUpperCase()} Register</h2>

            <input
              placeholder="Name"
              onChange={e => setForm({ ...form, username: e.target.value })}
            />

            <input
              placeholder="Email"
              onChange={e => setForm({ ...form, email: e.target.value })}
            />

            <input
              type="password"
              placeholder="Password"
              onChange={e => setForm({ ...form, password: e.target.value })}
            />

            <input
              placeholder="Mobile Number"
              onChange={e => setForm({ ...form, mobileNumber: e.target.value })}
            />

            <input
              placeholder="Address"
              onChange={e => setForm({ ...form, address: e.target.value })}
            />

            <input
              placeholder="Age"
              type="number"
              onChange={e => setForm({ ...form, age: e.target.value })}
            />

            <input
              placeholder="City"
              value={form.city || ""}
              onChange={e => setForm({ ...form, city: e.target.value })}
            />

            {/* Only for Donor */}
            {role === "donor" && (
              <>
                <select
                  defaultValue=""
                  onChange={e => setForm({ ...form, bloodGroup: e.target.value })}
                >
                  <option value="" disabled>Select Blood Group</option>
                  <option>A+</option><option>A-</option>
                  <option>B+</option><option>B-</option>
                  <option>AB+</option><option>AB-</option>
                  <option>O+</option><option>O-</option>
                </select>

                <label style={{ marginTop: "10px" }}>Last Donation Date</label>
                <input
                  type="date"
                  onChange={e =>
                    setForm({ ...form, lastDonationDate: e.target.value })
                  }
                />
              </>
            )}

            <button onClick={register}>Register</button>
          </div>
        </div>
      </div>
    </div>
  );
}
