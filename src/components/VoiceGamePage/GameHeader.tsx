import React, { useEffect, useState } from "react";
import "./GameHeader.css";

interface GameHeaderProps {
  onBack: () => void;
}

const GameHeader: React.FC<GameHeaderProps> = ({ onBack }) => {
  const [gameMode, setGameMode] = useState("Voice Bullet");

  useEffect(() => {
    const gameConfigStr = sessionStorage.getItem("gameConfig");
    if (gameConfigStr) {
      try {
        const config = JSON.parse(gameConfigStr);
        const timeControl = config.time || "1+0";
        const mode = config.mode === "voice" ? "Voice" : "Classic";
        
        // Determine time control category
        const [base] = timeControl.split("+").map(Number);
        let category = "Bullet";
        if (base >= 3 && base < 10) category = "Blitz";
        else if (base >= 10 && base < 25) category = "Rapid";
        else if (base >= 25) category = "Classical";
        
        setGameMode(`${mode} ${category}`);
      } catch (e) {
        console.error("Error parsing game config:", e);
      }
    }
  }, []);

  return (
    <div className="game-header">
      <button className="back-btn" onClick={onBack}>
        ← Back
      </button>
      <div className="player-avatar">👤</div>
      <div className="game-mode">
        <span className="mode-badge">🎤 {gameMode}</span>
        <span className="match-type">⚡ Random Match</span>
      </div>
      <div className="header-actions">
        <button className="icon-btn" title="Settings">⚙️</button>
        <button className="icon-btn" title="Chat">💬</button>
        <button className="resign-btn">🏳️ Resign</button>
      </div>
    </div>
  );
};

export default GameHeader;
