import React from "react";
import { useAuth } from "../hooks";

interface HeaderProps {
  username?: string;
  userPlan?: string;
  usageStats?: {
    clipboardItems: number;
    storageUsed: string;
    dailyLimit: number;
    dailyUsage: number;
  };
}

const Header: React.FC<HeaderProps> = ({ userPlan = "Free Plan" }) => {
  const { isAuthenticated, user } = useAuth();
  return (
    <header className="card card-hover">
      <div className="row-between">
        {/* Left: Branding + user info */}
        <div className="row-center gap-16">
          <div
            className="btn-icon"
            style={{
              background: "var(--accent-gradient)",
              borderRadius: "12px",
              boxShadow: "0 6px 16px rgba(61,113,236,0.28)",
            }}
          >
            <span
              style={{
                fontSize: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              📋
            </span>
          </div>
          <div>
            <h1
              className="gradient-text"
              style={{ margin: 0, fontWeight: 800 }}
            >
              Clipify
            </h1>
            <div
              className="row-center gap-12 text-muted"
              style={{ fontSize: 14 }}
            >
              {/* <span className="row-center gap-8" style={{ fontWeight: 600 }}>
                👤 {username}
              </span> */}
              <span
                className={`badge ${userPlan === "Pro Plan" ? "badge-success" : "badge-muted"}`}
              >
                {userPlan}
              </span>
            </div>
          </div>
        </div>

        {isAuthenticated && (
          <div
            className="card card-hover"
            style={{ marginTop: 12, marginBottom: 8 }}
          >
            <div className="row-center gap-12">
              <span style={{ fontSize: 18 }}>👋</span>
              <div style={{ fontWeight: 700 }}>
                Hi
                {user?.name
                  ? `, ${user.name}`
                  : user?.email
                    ? `, ${user.email.split("@")[0]}`
                    : " there"}
                !
              </div>
              <div className="text-muted" style={{ fontSize: 13 }}>
                Ready to tidy up your text with Cmd+Shift+C.
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
