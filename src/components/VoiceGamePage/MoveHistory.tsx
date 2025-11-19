import React from "react";
import "./MoveHistory.css";

interface MoveHistoryProps {
  moves: string[];
}

const MoveHistory: React.FC<MoveHistoryProps> = ({ moves }) => {
  const formatMoves = () => {
    const formatted = [];
    for (let i = 0; i < moves.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      formatted.push({
        number: moveNum,
        white: moves[i],
        black: moves[i + 1] || "",
      });
    }
    return formatted;
  };

  return (
    <div className="move-history">
      <div className="section-header">Move History</div>
      <div className="moves-list">
        {formatMoves().map((move) => (
          <div key={move.number} className="move-row">
            <span className="move-number">{move.number}.</span>
            <span className="move-notation">{move.white}</span>
            {move.black && <span className="move-notation">{move.black}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MoveHistory;
