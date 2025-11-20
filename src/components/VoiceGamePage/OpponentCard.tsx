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
  isThinking?: boolean; // NEW (optional)
}

const OpponentCard: React.FC<OpponentCardProps> = ({
  player,
  isThinking = false, // default
}) => {
  const minutes = Math.floor(player.time / 60);
  const seconds = player.time % 60;
  const isLowTime = player.time < 30;

  return (
    <div className={`player-card opponent-card ${isLowTime ? "low-time" : ""}`}>
      <div className="player-avatar-small">🤖</div>
      <div className="player-info">
        <div className="player-name">{player.name}</div>
        <div className="player-rating">Rating: {player.rating}</div>
        <div className="player-status">
          {isThinking ? "🤔 Thinking..." : "⏳ Waiting"}
        </div>
      </div>
      <div className={`player-time ${isLowTime ? "critical" : ""}`}>
        {minutes}:{seconds.toString().padStart(2, "0")}
      </div>
    </div>
  );
};

export default OpponentCard;
