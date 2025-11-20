import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Chess } from "chess.js";

import Chessboard from "../components/VoiceGamePage/Chessboard";
import GameHeader from "../components/VoiceGamePage/GameHeader";
import ControlsBar from "../components/VoiceGamePage/ControlsBar";
import OpponentCard from "../components/VoiceGamePage/OpponentCard";
import PlayerCard from "../components/VoiceGamePage/PlayerCard";
import MoveHistory from "../components/VoiceGamePage/MoveHistory";
import VoiceStatusBar from "../components/VoiceGamePage/VoiceStatusBar";

import { stockfishService } from "../utils/stockfishService";
import voiceCommandService from "../utils/voiceCommandService";
import speechService from "../utils/speechService";

import "./VoiceGamePage.css";

type GameStatus =
  | "playing"
  | "check"
  | "checkmate"
  | "stalemate"
  | "draw"
  | "timeout";

interface Player {
  name: string;
  rating: number;
  time: number;
  isAI?: boolean;
}

interface GameConfig {
  mode: "voice" | "classic";
  time: string; // e.g., "1+0", "3+2"
  versus: "random" | "friends";
}

const VoiceGamePage: React.FC = () => {
  const navigate = useNavigate();

  // Game state
  const gameRef = useRef<Chess>(new Chess());
  const [gameFen, setGameFen] = useState<string>(gameRef.current.fen());
  const [gameStatus, setGameStatus] = useState<GameStatus>("playing");
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [isAIThinking, setIsAIThinking] = useState(false);

  // UI state
  const [soundOn, setSoundOn] = useState(true);
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">(
    "white"
  );
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [detectedCommand, setDetectedCommand] = useState("");

  // Time control state
  const [playerTime, setPlayerTime] = useState(300); // in seconds
  const [opponentTime, setOpponentTime] = useState(300);
  const [timeControl, setTimeControl] = useState<{
    base: number;
    increment: number;
  }>({
    base: 300,
    increment: 0,
  });

  // Players
  const [opponent] = useState<Player>({
    name: "Stockfish AI",
    rating: 1923,
    time: 300,
    isAI: true,
  });

  const [player] = useState<Player>({
    name: "You",
    rating: 1847,
    time: 300,
  });

  // Refs
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const opponentTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Parse time control from session storage
  useEffect(() => {
    const gameConfigStr = sessionStorage.getItem("gameConfig");
    if (gameConfigStr) {
      try {
        const config: GameConfig = JSON.parse(gameConfigStr);
        const [base, increment] = config.time.split("+").map(Number);
        const baseSeconds = base * 60;
        const incrementSeconds = increment * 60;

        setTimeControl({ base: baseSeconds, increment: incrementSeconds });
        setPlayerTime(baseSeconds);
        setOpponentTime(baseSeconds);
      } catch (e) {
        console.error("Error parsing game config:", e);
      }
    }
  }, []);

  // Initialize Stockfish
  useEffect(() => {
    const initEngine = async () => {
      try {
        await stockfishService.initialize();
        console.log("Stockfish ready");
      } catch (e) {
        console.error("Error initializing Stockfish:", e);
      }
    };
    initEngine();

    return () => {
      stockfishService.terminate();
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
      if (playerTimerRef.current) clearInterval(playerTimerRef.current);
      if (opponentTimerRef.current) clearInterval(opponentTimerRef.current);
    };
  }, []);

  // Start player timer when it's their turn
  useEffect(() => {
    if (
      gameRef.current.turn() === "w" &&
      !isAIThinking &&
      !gameRef.current.isGameOver()
    ) {
      // Player's turn - start player timer
      if (playerTimerRef.current) clearInterval(playerTimerRef.current);
      if (opponentTimerRef.current) clearInterval(opponentTimerRef.current);

      playerTimerRef.current = setInterval(() => {
        setPlayerTime((prev) => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            handleTimeUp("player");
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else if (
      gameRef.current.turn() === "b" &&
      !gameRef.current.isGameOver()
    ) {
      // AI's turn - start opponent timer
      if (playerTimerRef.current) clearInterval(playerTimerRef.current);
      if (opponentTimerRef.current) clearInterval(opponentTimerRef.current);

      opponentTimerRef.current = setInterval(() => {
        setOpponentTime((prev) => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            handleTimeUp("opponent");
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (playerTimerRef.current) clearInterval(playerTimerRef.current);
      if (opponentTimerRef.current) clearInterval(opponentTimerRef.current);
    };
  }, [isAIThinking, gameStatus]);

  // Initialize voice recognition
  useEffect(() => {
    if (!voiceCommandService.isActive()) {
      startVoiceListening();
    }

    return () => {
      voiceCommandService.stopListening();
    };
  }, []);

  const startVoiceListening = () => {
    voiceCommandService.startListening({
      continuous: true,
      interimResults: true,
      language: "en-US",
      onListeningStart: () => {
        setIsVoiceActive(true);
      },
      onListeningStop: () => {
        setIsVoiceActive(false);
      },
      onError: (error) => {
        console.error("Voice error:", error);
      },
      onCommand: handleVoiceCommand,
      onTranscript: (transcript, isFinal) => {
        setCurrentTranscript(transcript);
        if (isFinal) {
          setTimeout(() => setCurrentTranscript(""), 2000);
        }
      },
    });
  };

  const handleTimeUp = (player: "player" | "opponent") => {
    if (playerTimerRef.current) clearInterval(playerTimerRef.current);
    if (opponentTimerRef.current) clearInterval(opponentTimerRef.current);

    setGameStatus("timeout");
    const winner = player === "player" ? "opponent" : "player";
    const winnerName = winner === "opponent" ? "Stockfish AI" : "You";
    const loserName = player === "player" ? "You" : "Stockfish AI";

    const message = `Time's up! ${loserName} ran out of time. ${winnerName} wins!`;
    speakMessage(message);
  };

  const updateGameStatus = (game: Chess) => {
    if (game.isCheckmate()) setGameStatus("checkmate");
    else if (game.isStalemate()) setGameStatus("stalemate");
    else if (game.isDraw()) setGameStatus("draw");
    else if (game.isCheck()) setGameStatus("check");
    else setGameStatus("playing");
  };

  const getStatusText = () => {
    if (gameStatus === "timeout") return "⏰ Time's up!";
    if (isAIThinking) return "🤖 AI is thinking...";
    if (gameStatus === "checkmate") return "👑 Checkmate!";
    if (gameStatus === "stalemate") return "⚖️ Stalemate";
    if (gameStatus === "draw") return "🤝 Draw";
    if (gameStatus === "check") return "⚠️ Check!";
    return gameRef.current.turn() === "w" ? "👤 Your turn" : "🤖 AI's turn";
  };

  const speakMessage = async (message: string) => {
    if (soundOn && speechService.isSupportedBrowser()) {
      try {
        await speechService.speak({
          text: message,
          rate: 1.0,
          volume: 0.9,
        });
      } catch (e) {
        console.warn("Speech failed:", e);
      }
    }
  };

  // Parse voice command for moves
  const parseVoiceMove = (
    transcript: string
  ): { from: string; to: string } | null => {
    const text = transcript.toLowerCase().trim();

    // Piece names mapping
    const pieceMap: { [key: string]: string } = {
      knight: "n",
      bishop: "b",
      rook: "r",
      queen: "q",
      king: "k",
      pawn: "p",
    };

    // Square names
    const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const ranks = ["1", "2", "3", "4", "5", "6", "7", "8"];

    // Pattern: "knight to e5", "e4", "bishop takes c6", "castle kingside"
    let from: string | null = null;
    let to: string | null = null;

    // Handle castling
    if (text.includes("castle") || text.includes("castling")) {
      if (text.includes("kingside") || text.includes("king side")) {
        const game = new Chess(gameRef.current.fen());
        const moves = game.moves({ verbose: true });
        const castleMove = moves.find((m) => m.san === "O-O");
        if (castleMove) {
          return { from: castleMove.from, to: castleMove.to };
        }
      } else if (text.includes("queenside") || text.includes("queen side")) {
        const game = new Chess(gameRef.current.fen());
        const moves = game.moves({ verbose: true });
        const castleMove = moves.find((m) => m.san === "O-O-O");
        if (castleMove) {
          return { from: castleMove.from, to: castleMove.to };
        }
      }
      return null;
    }

    // Extract squares from text
    const squarePattern = /([a-h][1-8])/g;
    const squares = text.match(squarePattern) || [];

    if (squares.length >= 2) {
      from = squares[0];
      to = squares[1];
    } else if (squares.length === 1) {
      // Try to find piece and destination
      to = squares[0];

      // Look for piece name
      for (const [piece, symbol] of Object.entries(pieceMap)) {
        if (text.includes(piece)) {
          // Find all pieces of this type that can move to destination
          const game = new Chess(gameRef.current.fen());
          const moves = game.moves({ verbose: true });
          const validMoves = moves.filter(
            (m) => m.piece === symbol && m.to === to
          );

          if (validMoves.length === 1) {
            from = validMoves[0].from;
            break;
          } else if (validMoves.length > 1) {
            // Ambiguous - try to disambiguate from text
            for (const move of validMoves) {
              if (text.includes(move.from)) {
                from = move.from;
                break;
              }
            }
            if (!from) from = validMoves[0].from;
          }
        }
      }
    }

    if (from && to) {
      return { from, to };
    }

    return null;
  };

  const handleVoiceCommand = async (command: any) => {
    console.log("Voice command:", command);

    // Try to parse as a move
    const moveAttempt = parseVoiceMove(command.originalText);

    if (moveAttempt) {
      setDetectedCommand(`"${command.originalText}"`);
      setTimeout(() => setDetectedCommand(""), 3000);

      makePlayerMove(moveAttempt.from, moveAttempt.to);
    }
  };

  // --------- PLAYER MOVE ----------
  const makePlayerMove = (from: string, to: string, promotion?: string) => {
    if (
      gameRef.current.turn() !== "w" ||
      isAIThinking ||
      gameRef.current.isGameOver()
    ) {
      return;
    }

    console.log("Player tries:", from, "->", to);

    const game = new Chess(gameRef.current.fen());
    const move = game.move({
      from,
      to,
      promotion: promotion || "q",
    });

    if (!move) {
      console.warn("Invalid player move");
      speakMessage("That is an illegal move. Please say another legal move.");
      return;
    }

    console.log("Player move SAN:", move.san);

    // Add increment to player time
    setPlayerTime((prev) => prev + timeControl.increment);

    gameRef.current = game;
    setGameFen(game.fen());
    setMoveHistory((prev) => [...prev, move.san]);
    updateGameStatus(game);

    // Announce move
    speakMessage(`You played ${move.san}`);

    if (game.isGameOver()) {
      if (game.isCheckmate()) {
        speakMessage("Checkmate! You win!");
      } else if (game.isStalemate()) {
        speakMessage("Stalemate! The game is a draw.");
      } else if (game.isDraw()) {
        speakMessage("Draw!");
      }
      setIsAIThinking(false);
      return;
    }

    setIsAIThinking(true);
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    aiTimeoutRef.current = setTimeout(() => {
      makeAIMove();
    }, 700);
  };

  // --------- AI MOVE ----------
  const makeAIMove = async () => {
    try {
      const game = new Chess(gameRef.current.fen());
      const fen = game.fen();
      console.log("AI thinking from FEN:", fen);

      const bestMove = await stockfishService.getBestMove(fen, 8);

      if (!bestMove) {
        console.warn("No best move, using random");
        makeRandomAIMove();
        return;
      }

      const move = game.move({
        from: bestMove.from,
        to: bestMove.to,
        promotion: bestMove.promotion || "q",
      });

      if (!move) {
        console.warn("Engine move invalid, using random");
        makeRandomAIMove();
        return;
      }

      console.log("AI move SAN:", move.san);

      // Add increment to opponent time
      setOpponentTime((prev) => prev + timeControl.increment);

      gameRef.current = game;
      setGameFen(game.fen());
      setMoveHistory((prev) => [...prev, move.san]);
      updateGameStatus(game);

      // Announce AI move
      speakMessage(`Opponent played ${move.san}`);

      if (game.isGameOver()) {
        if (game.isCheckmate()) {
          speakMessage("Checkmate! Opponent wins!");
        } else if (game.isStalemate()) {
          speakMessage("Stalemate! The game is a draw.");
        } else if (game.isDraw()) {
          speakMessage("Draw!");
        }
        setIsAIThinking(false);
        return;
      }

      setIsAIThinking(false);
    } catch (e) {
      console.error("AI move error:", e);
      makeRandomAIMove();
    }
  };

  const makeRandomAIMove = () => {
    const game = new Chess(gameRef.current.fen());
    const moves = game.moves({ verbose: true });

    if (moves.length === 0) {
      updateGameStatus(game);
      setIsAIThinking(false);
      return;
    }

    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    const move = game.move(randomMove);
    if (move) {
      console.log("AI random move SAN:", move.san);

      // Add increment to opponent time
      setOpponentTime((prev) => prev + timeControl.increment);

      gameRef.current = game;
      setGameFen(game.fen());
      setMoveHistory((prev) => [...prev, move.san]);
      updateGameStatus(game);

      speakMessage(`Opponent played ${move.san}`);
    }

    setIsAIThinking(false);
  };

  // --------- UNDO ----------
  const handleUndo = () => {
    const game = new Chess(gameRef.current.fen());
    if (game.history().length === 0) return;

    // Undo AI move (if there is one)
    game.undo();
    // Undo player move (if there is one)
    if (game.history().length > 0) game.undo();

    gameRef.current = game;
    setGameFen(game.fen());
    setMoveHistory((prev) => prev.slice(0, -2));
    updateGameStatus(game);
    setIsAIThinking(false);
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
  };

  // --------- BOARD DISABLED LOGIC ----------
  const isBoardDisabled =
    isAIThinking ||
    gameRef.current.isGameOver() ||
    gameRef.current.turn() !== "w" ||
    gameStatus === "timeout";

  return (
    <div className="voice-game-page">
      <GameHeader
        onBack={() => {
          sessionStorage.removeItem("gameConfig");
          navigate("/home");
        }}
      />

      {isVoiceActive && (
        <VoiceStatusBar
          transcript={currentTranscript}
          detectedCommand={detectedCommand}
        />
      )}

      <div className="game-title-bar">
        <h2 className="game-title">🎤 Voice Chess Game</h2>
        <p className="game-subtitle">{getStatusText()}</p>
      </div>

      <div className="main-content">
        <div className="left-section">
          <div className="board-container">
            <div className="chessboard-area">
              <Chessboard
                gameFen={gameFen}
                onMove={makePlayerMove}
                boardOrientation={boardOrientation}
                disabled={isBoardDisabled}
              />
            </div>

            <ControlsBar
              onFlipBoard={() =>
                setBoardOrientation((prev) =>
                  prev === "white" ? "black" : "white"
                )
              }
              soundOn={soundOn}
              onToggleSound={() => setSoundOn((prev) => !prev)}
              onUndo={handleUndo}
              isGameOver={gameRef.current.isGameOver()}
            />
          </div>
        </div>

        <div className="right-sidebar">
          <OpponentCard
            player={{ ...opponent, time: opponentTime }}
            isThinking={isAIThinking}
          />
          <PlayerCard
            player={{ ...player, time: playerTime }}
            isYourTurn={
              !isAIThinking &&
              !gameRef.current.isGameOver() &&
              gameRef.current.turn() === "w"
            }
          />
          <MoveHistory moves={moveHistory} />
        </div>
      </div>
    </div>
  );
};

export default VoiceGamePage;
