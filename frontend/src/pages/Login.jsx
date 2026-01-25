import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { api } from "../api";
import '../css/login.css';

export default function Login() {
  const { role } = useParams(); // admin | user | donor
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    let data;

    if (role === "admin") {
      data = await api("/api/auth/admin/login", "POST", {
        username,
        password,
      });
    } else {
      data = await api("/api/auth/login", "POST", {
        email,
        password,
        role: role.toUpperCase(), // USER or DONOR
      });
    }

    if (data.token) {
      localStorage.setItem("token", data.token);
      nav("/" + role);
    } else {
      alert(data.message || "Login failed");
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">

        {/* LEFT PANEL (visual only) */}
        <div className="login-left">
          <h1>Welcome Back</h1>
          <p>Securely access your {role} account</p>
        </div>

        {/* RIGHT PANEL (YOUR EXISTING CONTENT) */}
        <div className="login-right">
          <div className="card">
            <h2>{role} Login</h2>

            {role === "admin" ? (
              <input
                placeholder="Username"
                onChange={(e) => setUsername(e.target.value)}
              />
            ) : (
              <input
                placeholder="Email"
                onChange={(e) => setEmail(e.target.value)}
              />
            )}

            <input
              type="password"
              placeholder="Password"
              onChange={(e) => setPassword(e.target.value)}
            />

            <button onClick={login}>Login</button>

            {role !== "admin" ? (
              <p onClick={() => nav("/register/" + role)}>
                Create account
              </p>
              
            ) : (
              <p onClick={() => nav("/")}>Back</p>
            
            )}
             {/* <p
          className="forgot"
          onClick={() => nav(`/forgot-password/${role}`)}
        > */}
          {/* Forgot password?
        </p> */}

          </div>

        </div>
       

      </div>
      
    </div>
  );
}