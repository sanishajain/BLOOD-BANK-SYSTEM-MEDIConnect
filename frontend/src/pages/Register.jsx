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
    city: "",
    isNewDonor: true,
    lastDonationDate: ""
  });

  const [error, setError] = useState("");

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const register = async () => {
    setError("");

    // Basic required validation
    if (
      !form.username ||
      !form.email ||
      !form.password ||
      !form.mobileNumber ||
      !form.address ||
      !form.age ||
      !form.city
    ) {
      setError("Please fill all required fields.");
      return;
    }

    if (role === "donor") {
      const age = Number(form.age);

      // ✅ Age validation
      if (isNaN(age) || age < 18) {
        setError("Donor must be at least 18 years old.");
        return;
      }

      if (age > 60) {
        setError("Donor age must be below 60.");
        return;
      }

      if (!form.bloodGroup) {
        setError("Please select blood group.");
        return;
      }

      // ✅ If NOT new donor → validate last donation
      if (!form.isNewDonor) {
        if (!form.lastDonationDate) {
          setError("Please select last donation date.");
          return;
        }

        const lastDate = new Date(form.lastDonationDate);
        const today = new Date();
        const diffDays =
          (today - lastDate) / (1000 * 60 * 60 * 24);

        if (diffDays < 56) {
          setError("You must wait 56 days between donations.");
          return;
        }
      }
    }

    try {
      await api(`/api/auth/register/${role}`, "POST", form);
      nav("/login/" + role);
    } catch (e) {
      setError("Registration failed. Try again.");
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">

        <div className="register-left">
          <h1>Join Us</h1>
          <p>
            Register as <b>{role}</b> and start using the system.
          </p>
        </div>

        <div className="register-right">
          <div className="card">
            <h2>{role?.toUpperCase()} Register</h2>

            {error && <p className="error">{error}</p>}

            <input
              placeholder="Name"
              value={form.username}
              onChange={e => handleChange("username", e.target.value)}
            />

            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={e => handleChange("email", e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={e => handleChange("password", e.target.value)}
            />

            <input
              placeholder="Mobile Number"
              value={form.mobileNumber}
              onChange={e => handleChange("mobileNumber", e.target.value)}
            />

            <input
              placeholder="Address"
              value={form.address}
              onChange={e => handleChange("address", e.target.value)}
            />

            <input
              type="number"
              min="18"
              placeholder="Age"
              value={form.age}
              onChange={e => handleChange("age", e.target.value)}
            />

            <input
              placeholder="City"
              value={form.city}
              onChange={e => handleChange("city", e.target.value)}
            />

            {/* ===== DONOR ONLY FIELDS ===== */}
            {role === "donor" && (
              <>
                <select
                  value={form.bloodGroup}
                  onChange={e => handleChange("bloodGroup", e.target.value)}
                >
                  <option value="">Select Blood Group</option>
                  <option>A+</option>
                  <option>A-</option>
                  <option>B+</option>
                  <option>B-</option>
                  <option>AB+</option>
                  <option>AB-</option>
                  <option>O+</option>
                  <option>O-</option>
                </select>

                {/* New Donor Question */}
                <label className="donation-label">
                  Are you a new donor?
                </label>

                <select
                  value={form.isNewDonor ? "yes" : "no"}
                  onChange={e =>
                    handleChange(
                      "isNewDonor",
                      e.target.value === "yes"
                    )
                  }
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>

                {/* Show only if NOT new donor */}
                {!form.isNewDonor && (
                  <>
                    <label className="donation-label">
                      Last Donation Date
                    </label>

                    <input
                      type="date"
                      value={form.lastDonationDate}
                      onChange={e =>
                        handleChange(
                          "lastDonationDate",
                          e.target.value
                        )
                      }
                    />
                  </>
                )}
              </>
            )}

            <button onClick={register}>
              Register
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
