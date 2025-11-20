import React from "react";
import "./VoiceStatusBar.css";

export interface VoiceStatusBarProps {
  /** Whether voice recognition is currently listening */
  isActive: boolean;
  /** Toggle listening on/off */
  onToggle: () => void;
  /** 0–100 percent progress (you can keep it 100 for now) */
  progress: number;
  /** Optional: show disabled state while AI is thinking */
  isAIThinking?: boolean;
}

const VoiceStatusBar: React.FC<VoiceStatusBarProps> = ({
  isActive,
  onToggle,
  progress,
  isAIThinking = false,
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className="voice-status-bar">
      <div className="voice-status-content">
        <div className="voice-indicator">
          <span className={`voice-dot ${isActive ? "pulsing" : ""}`} />
          <div>
            <div className="voice-status-title">
              {isActive ? "Voice commands active" : "Voice commands paused"}
            </div>
            <div className="voice-status-subtitle">
              {isAIThinking
                ? "Opponent is thinking..."
                : isActive
                ? "Say a move like “Knight to F3” or “Play E4”."
                : "Press Resume Voice to start listening again."}
            </div>
          </div>
        </div>
        <div className="voice-progress-bar">
          <div
            className="voice-progress-fill"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
      </div>

      <button
        className="pause-voice-btn"
        onClick={onToggle}
        disabled={isAIThinking}
      >
        🔇 {isActive ? "Pause Voice" : "Resume Voice"}
      </button>
    </div>
  );
};

export default VoiceStatusBar;
