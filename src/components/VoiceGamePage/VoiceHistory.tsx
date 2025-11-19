import React from "react";
import "./VoiceHistory.css";

interface VoiceCommand {
  id: string;
  text: string;
  timestamp: Date;
  status: "executed" | "processing" | "failed";
}

interface VoiceHistoryProps {
  commands: VoiceCommand[];
}

const VoiceHistory: React.FC<VoiceHistoryProps> = ({ commands }) => {
  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  return (
    <div className="voice-history">
      <div className="section-header">
        <span className="mic-icon">🎤</span>
        <span>Voice Command History</span>
        <span className="live-badge">Live</span>
      </div>
      <div className="command-list">
        {commands.map((cmd) => (
          <div key={cmd.id} className="command-item">
            <div className="command-dot"></div>
            <div className="command-details">
              <div className="command-text-display">"{cmd.text}"</div>
              <div className="command-meta">
                <span className="command-time">
                  ⏱ {getTimeAgo(cmd.timestamp)}
                </span>
              </div>
            </div>
            {cmd.status === "executed" && (
              <span className="status-badge executed">✓ Executed</span>
            )}
            {cmd.status === "processing" && (
              <span className="status-badge processing">⏳ Processing</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VoiceHistory;
