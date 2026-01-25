import "../css/intro.css";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Intro() {
  const nav = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => nav("/roles"), 2500);
    return () => clearTimeout(t);
  }, [nav]);

  return (
    <div className="intro-page">
      <div className="intro-overlay"></div>

      <div className="intro-card">
        <h1 className="intro-title">🩸 Mediconnect</h1>
        <p className="intro-tagline">
          Connecting Life, One Drop at a Time
        </p>
      </div>
    </div>
  );
}
