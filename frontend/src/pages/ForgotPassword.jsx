import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { api } from "../api";

export default function ForgotPassword() {
  const { role } = useParams(); // user | donor
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const submit = async () => {
    const res = await api("/api/auth/forgot-password", "POST", {
      email,
      role: role.toUpperCase(),
    });

    if (res.message) setMsg(res.message);
  };

  return (
    <div>
      <h2>Forgot Password</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <button onClick={submit}>Send Reset Link</button>

      {msg && <p>{msg}</p>}

      <p onClick={() => nav(`/login/${role}`)}>Back to Login</p>
    </div>
  );
}
