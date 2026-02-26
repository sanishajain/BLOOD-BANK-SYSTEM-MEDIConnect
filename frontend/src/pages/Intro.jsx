import "../css/intro.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Intro() {
  const nav = useNavigate();
  const [exit, setExit] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setExit(true), 2000);
    const t2 = setTimeout(() => nav("/roles"), 2600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [nav]);

  return (
    <div className={`intro-container ${exit ? "fade-out" : ""}`}>
      <div className="intro-center">
        <div className="logo-badge">
          <i className="fa-solid fa-droplet logo-icon"></i>
        </div>
        <h1 className="app-name">Mediconnect</h1>
        <p className="tagline">Connecting Life, One Drop at a Time</p>
      </div>
    </div>
  );
}