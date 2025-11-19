import React from "react";
import "./DetectedCommandBanner.css";

interface DetectedCommandBannerProps {
  command: string | null;
}

const DetectedCommandBanner: React.FC<DetectedCommandBannerProps> = ({
  command,
}) => {
  if (!command) return null;

  return (
    <div className="detected-command-banner">
      <div className="command-content">
        <span className="mic-icon">🎤</span>
        <span className="command-text">"{command}"</span>
      </div>
      <span className="processing-badge">Processing...</span>
    </div>
  );
};

export default DetectedCommandBanner;
