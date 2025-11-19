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
  isYourTurn?: boolean; // NEW (optional)
}

const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isYourTurn = false, // default
}) => {
  const minutes = Math.floor(player.time / 60);
  const seconds = player.time % 60;

  return (
    <div className="player-card your-card">
      <div className="player-avatar-small">U</div>
      <div className="player-info">
        <div className="player-name">{player.name}</div>
        <div className="player-rating">Rating: {player.rating}</div>
        <div className="player-status">
          {isYourTurn ? "Your turn" : "Waiting for opponent"}
        </div>
      </div>
      <div className="player-time">
        {minutes}:{seconds.toString().padStart(2, "0")}
      </div>
    </div>
  );
};

export default PlayerCard;
