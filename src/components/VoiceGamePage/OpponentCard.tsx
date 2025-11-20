import React from "react";
import "./OpponentCard.css";

interface Player {
  name: string;
  rating: number;
  time: number;
  isAI?: boolean;
}

interface OpponentCardProps {
  player: Player;
  isThinking?: boolean;
}

const OpponentCard: React.FC<OpponentCardProps> = ({
  player,
  isThinking = false,
}) => {
  const minutes = Math.floor(player.time / 60);
  const seconds = player.time % 60;
  const isLowTime = player.time < 30;
  const isCritical = player.time < 10;

  return (
    <div className={`player-card opponent-card ${isLowTime ? "low-time" : ""}`}>
      <div className="player-avatar-small opponent-avatar">🤖</div>
      <div className="player-info">
        <div className="player-name">{player.name}</div>
        <div className="player-rating">⭐ Rating: {player.rating}</div>
        {isThinking && (
          <div className="player-status thinking-indicator">
            <span className="thinking-dots">
              <span></span>
              <span></span>
              <span></span>
            </span>
            🤔 Thinking...
          </div>
        )}
        {!isThinking && <div className="player-status">⏳ Waiting</div>}
      </div>
      <div className={`player-time ${isCritical ? "critical" : ""}`}>
        {minutes}:{seconds.toString().padStart(2, "0")}
      </div>
    </div>
  );
};

export default OpponentCard;
