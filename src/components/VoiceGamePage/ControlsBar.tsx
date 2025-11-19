import React from "react";
import "./ControlsBar.css";

interface ControlsBarProps {
  onFlipBoard: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
  onUndo: () => void;
  isGameOver?: boolean; // NEW (optional)
}

const ControlsBar: React.FC<ControlsBarProps> = ({
  onFlipBoard,
  soundOn,
  onToggleSound,
  onUndo,
  isGameOver = false, // default
}) => {
  return (
    <div className="controls-bar">
      <button className="control-btn" onClick={onFlipBoard}>
        🔄 Flip Board
      </button>
      <button className="control-btn" onClick={onToggleSound}>
        {soundOn ? "🔊" : "🔇"} Sound {soundOn ? "On" : "Off"}
      </button>
      <button
        className="control-btn"
        onClick={onUndo}
        disabled={isGameOver} // disable undo when game is over
      >
        ↶ Undo
      </button>
    </div>
  );
};

export default ControlsBar;
