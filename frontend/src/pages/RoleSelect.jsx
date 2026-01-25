import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "../css/roles.css";

export default function RoleSelect() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState("");

  const handleRoleSelect = (role) => {
    setSelectedRole(role);

    // Admin → direct
    if (role === "admin") {
      nav("/login/admin");
      return;
    }

    // Donor / User → show awareness slide
    setStep(2);
  };

  const continueToLogin = () => {
    nav(`/login/${selectedRole}`);
  };

  return (
    <div className="role-page">
      <div className="role-card">

        <div className={`slider step-${step}`}>

          {/* SLIDE 1 */}
          <div className="slide">
            <h2 className="role-title">SELECT USER TYPE</h2>

            <div className="role-options">
              <div className="role-circle" onClick={() => handleRoleSelect("admin")}>
                <img src="/setting.png" alt="Admin" />
                <span>ADMIN</span>
              </div>

              <div className="role-circle" onClick={() => handleRoleSelect("donor")}>
                <img src="/donor.png" alt="Donor" />
                <span>DONOR</span>
              </div>

              <div className="role-circle" onClick={() => handleRoleSelect("user")}>
                <img src="/multiple-users-silhouette.png" alt="User" />
                <span>USER</span>
              </div>
            </div>
          </div>

          {/* SLIDE 2 – AWARENESS ONLY */}
          <div className="slide">
            <h2 className="role-title">
              {selectedRole === "donor" ? "DONOR GUIDELINES" : "USER GUIDELINES"}
            </h2>

            <ul className="rules">
              {selectedRole === "donor" ? (
                <>
                  <li>🩸 Donate only if you are medically fit</li>
                  <li>⏱ Maintain a safe gap between donations</li>
                  <li>❤️ Your donation can save multiple lives</li>
                  <li>📍 Update availability honestly</li>
                </>
              ) : (
                <>
                  <li>🔒 Respect donor privacy</li>
                  <li>📞 Contact donors responsibly</li>
                  <li>🚫 Do not misuse emergency requests</li>
                  <li>🤝 Use the platform ethically</li>
                </>
              )}
            </ul>

            <button className="next-btn" onClick={continueToLogin}>
              CONTINUE
            </button>

            <p className="skip" onClick={continueToLogin}>
              Skip
            </p>
          </div>
        </div>

        {/* DOTS */}
        <div className="dots">
          <span className={step === 1 ? "active" : ""} onClick={() => setStep(1)} />
          <span
            className={step === 2 ? "active" : ""}
            onClick={() => selectedRole && setStep(2)}
            style={{ opacity: selectedRole ? 1 : 0.4 }}
          />
        </div>

      </div>
    </div>
  );
}
