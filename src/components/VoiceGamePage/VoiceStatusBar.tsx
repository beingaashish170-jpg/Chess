import React from "react";
import "./VoiceStatusBar.css";

interface VoiceStatusBarProps {
  transcript: string;
  detectedCommand: string;
}

const VoiceStatusBar: React.FC<VoiceStatusBarProps> = ({
  transcript,
  detectedCommand,
}) => {
  return (
    <div className="voice-status-bar">
      <div className="voice-status-content">
        <div className="voice-icon">
          <span className="voice-dot pulsing">🎤</span>
          <span className="voice-label">Voice Mode Active</span>
        </div>

        <div className="voice-info">
          {detectedCommand && (
            <div className="detected-command">
              <span className="command-label">Detected:</span>
              <span className="command-text">{detectedCommand}</span>
              <span className="command-status">✓ Executed</span>
            </div>
          )}

          {transcript && !detectedCommand && (
            <div className="interim-transcript">
              <span className="transcript-label">Listening:</span>
              <span className="transcript-text">{transcript}</span>
            </div>
          )}

          {!transcript && !detectedCommand && (
            <div className="listening-prompt">
              <span>Say a move like "e4", "knight to f3", or "castle kingside"</span>
            </div>
          )}
        </div>

        <div className="voice-indicator">
          <div className="sound-wave">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceStatusBar;
