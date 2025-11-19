import React from "react";
import "./GameHeader.css";

interface GameHeaderProps {
  onBack: () => void;
}

const GameHeader: React.FC<GameHeaderProps> = ({ onBack }) => {
  return (
    <div className="game-header">
      <button className="back-btn" onClick={onBack}>
        ← Back
      </button>
      <div className="player-avatar">U</div>
      <div className="game-mode">
        <span className="mode-badge">🎤 Voice Rated Bullet</span>
        <span className="match-type">⚡ Random Match</span>
      </div>
      <div className="header-actions">
        <button className="icon-btn">⚙️</button>
        <button className="icon-btn">💬</button>
        <button className="resign-btn">🏳️ Resign</button>
      </div>
    </div>
  );
};

export default GameHeader;
