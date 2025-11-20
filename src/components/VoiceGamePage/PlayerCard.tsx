import React from "react";
import "./PlayerCard.css";

interface Player {
  name: string;
  rating: number;
  time: number;
  isAI?: boolean;
}

interface PlayerCardProps {
  player: Player;
  isYourTurn?: boolean;
}

const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isYourTurn = false,
}) => {
  const minutes = Math.floor(player.time / 60);
  const seconds = player.time % 60;
  const isLowTime = player.time < 30;
  const isCritical = player.time < 10;

  return (
    <div
      className={`player-card your-card ${isYourTurn ? "active-turn" : ""} ${
        isLowTime ? "low-time" : ""
      }`}
    >
      <div className="player-avatar-small">👤</div>
      <div className="player-info">
        <div className="player-name">{player.name}</div>
        <div className="player-rating">⭐ Rating: {player.rating}</div>
        {isYourTurn && (
          <div className="player-status turn-indicator">
            <span className="turn-pulse"></span>
            🎯 Your turn
          </div>
        )}
        {!isYourTurn && <div className="player-status">⏳ Waiting</div>}
      </div>
      <div className={`player-time ${isCritical ? "critical" : ""}`}>
        {minutes}:{seconds.toString().padStart(2, "0")}
      </div>
    </div>
  );
};

export default PlayerCard;
