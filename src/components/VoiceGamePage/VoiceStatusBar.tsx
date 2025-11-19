import React from "react";
import "./VoiceStatusBar.css";

interface VoiceStatusBarProps {
  isActive: boolean;
  onToggle: () => void;
  progress: number;
  isAIThinking?: boolean; // NEW (optional)
}

const VoiceStatusBar: React.FC<VoiceStatusBarProps> = ({
  isActive,
  onToggle,
  progress,
  isAIThinking = false, // default
}) => {
  // Decide what text to show
  const mainText = isAIThinking
    ? "AI is thinking..."
    : isActive
    ? "Voice Mode Active"
    : "Voice Mode Paused";

  const instructionText = isAIThinking
    ? "Please wait for AI move…"
    : 'Speak clearly: "Knight to F3" or click pieces';

  return (
    <div className="voice-status-bar">
      <div className="voice-status-content">
        <div className="voice-indicator">
          <span className="mic-icon">🎤</span>
          <span className="voice-text">{mainText}</span>
          <span className="sparkle">✨</span>
        </div>
        <div className="voice-instruction">{instructionText}</div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
      <button
        className="pause-voice-btn"
        onClick={onToggle}
        disabled={isAIThinking} // optional: lock while AI is thinking
      >
        🔇 {isActive ? "Pause Voice" : "Resume Voice"}
      </button>
    </div>
  );
};

export default VoiceStatusBar;
