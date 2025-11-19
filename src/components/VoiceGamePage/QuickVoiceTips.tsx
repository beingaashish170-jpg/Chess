import React from "react";
import "./QuickVoiceTips.css";

const QuickVoiceTips: React.FC = () => {
  return (
    <div className="quick-voice-tips">
      <div className="tips-header">💡 Quick Voice Tips</div>
      <div className="tips-list">
        <div className="tip-item">
          Use piece names: "Knight", "Bishop", "Queen"
        </div>
        <div className="tip-item">Specify square: "to F3", "takes E5"</div>
        <div className="tip-item">Special moves: "Castle kingside"</div>
      </div>
    </div>
  );
};

export default QuickVoiceTips;
