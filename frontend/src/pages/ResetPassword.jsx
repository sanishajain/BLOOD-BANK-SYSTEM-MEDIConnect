import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { api } from "../api";
import "../css/login.css";

export default function ResetPassword() {
  const { token } = useParams();
  const nav = useNavigate();

  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const reset = async () => {
    const res = await api(`/api/auth/reset-password/${token}`, "POST", {
      password
    });

    if (res.message) {
      setMessage(res.message);
      setTimeout(() => nav("/"), 2000);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-left">
          <h1>Set New Password</h1>
          <p>Choose a strong password</p>
        </div>

        <div className="login-right">
          <div className="card">
            <h2>Reset Password</h2>

            <input
              type="password"
              placeholder="New Password"
              onChange={e => setPassword(e.target.value)}
            />

            <button onClick={reset}>Update Password</button>

            {message && <p>{message}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
