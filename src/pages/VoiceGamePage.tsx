/**
 * VoiceGamePage.tsx
 *
 * Voice-enabled chess vs AI with:
 * - chess.js game logic
 * - Stockfish AI
 * - Time controls + increment (from sessionStorage.gameConfig.time)
 * - Web Speech API (STT + TTS) for voice commands + announcements
 */

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Chess, Move } from "chess.js";

import Chessboard from "../components/VoiceGamePage/Chessboard";
import GameHeader from "../components/VoiceGamePage/GameHeader";
import VoiceStatusBar from "../components/VoiceGamePage/VoiceStatusBar";
import VoiceHistory from "../components/VoiceGamePage/VoiceHistory";
import QuickVoiceTips from "../components/VoiceGamePage/QuickVoiceTips";
import MoveHistory from "../components/VoiceGamePage/MoveHistory";
import PlayerCard from "../components/VoiceGamePage/PlayerCard";
import OpponentCard from "../components/VoiceGamePage/OpponentCard";
import ControlsBar from "../components/VoiceGamePage/ControlsBar";
import DetectedCommandBanner from "../components/VoiceGamePage/DetectedCommandBanner";

import "./VoiceGamePage.css";

import speechService from "../utils/speechService";
import { stockfishService } from "../utils/stockfishService";
import type { StockfishMove } from "../utils/stockfishService";

type GameStatus =
  | "playing"
  | "check"
  | "checkmate"
  | "stalemate"
  | "draw"
  | "timeout";

interface PlayerInfo {
  name: string;
  rating: number;
  time: number; // seconds remaining
  isAI?: boolean;
}

interface VoiceCommandHistoryItem {
  id: string;
  text: string;
  timestamp: Date;
  status: "executed" | "processing" | "failed";
}

// Web Speech API types
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const VoiceGamePage: React.FC = () => {
  const navigate = useNavigate();

  // --- Chess game state ---
  const gameRef = useRef<Chess>(new Chess());
  const [gameFen, setGameFen] = useState<string>(gameRef.current.fen());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus>("playing");

  // --- Time control state (seconds) ---
  const [playerTime, setPlayerTime] = useState<number>(300);
  const [opponentTime, setOpponentTime] = useState<number>(300);
  const [incrementSeconds, setIncrementSeconds] = useState<number>(0);
  const [timeLabel, setTimeLabel] = useState<string>("5+0");
  const timerIntervalRef = useRef<number | null>(null);
  const timeUpHandledRef = useRef<boolean>(false);

  // --- UI / players ---
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">(
    "white"
  );
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const [player, setPlayer] = useState<PlayerInfo>({
    name: "You",
    rating: 1847,
    time: playerTime,
  });

  const [opponent, setOpponent] = useState<PlayerInfo>({
    name: "Chess4Everyone AI",
    rating: 1900,
    time: opponentTime,
    isAI: true,
  });

  // --- AI state ---
  const [isAIThinking, setIsAIThinking] = useState<boolean>(false);
  const aiTimeoutRef = useRef<number | null>(null);

  // --- Voice recognition state ---
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [, setCurrentTranscript] = useState<string>(""); // we only need the setter
  const [detectedCommand, setDetectedCommand] = useState<string | null>(null);
  const [voiceProgress, setVoiceProgress] = useState<number>(100);
  const recognitionRef = useRef<any | null>(null);

  // --- Voice command history ---
  const [commandHistory, setCommandHistory] = useState<
    VoiceCommandHistoryItem[]
  >([]);

  // Player is white, AI is black
  const playerColor: "w" = "w";
  const aiColor: "b" = "b";

  // -----------------------------------------------------
  // Time control: parse "5+3", "1+0", "0.5+0", "10+5"
  // X+Y => X minutes base, Y *seconds* increment
  // -----------------------------------------------------
  const parseTimeControl = (tc: string | null | undefined) => {
    if (!tc) {
      return { baseSeconds: 300, incSeconds: 0, label: "5+0" };
    }

    const parts = String(tc).split("+");
    const baseMins = parseFloat(parts[0] || "5");
    const incSecs = parseFloat(parts[1] || "0");
    const baseSecs = Math.round(baseMins * 60);

    return {
      baseSeconds: baseSecs,
      incSeconds: Math.round(incSecs),
      label: tc,
    };
  };

  // -----------------------------------------------------
  // Convert SAN -> speech, e.g. "Nf3" -> "Knight to f3"
  // -----------------------------------------------------
  const sanToSpeech = (san: string): string => {
    const clean = san.replace(/[+#]/g, "");
    if (clean === "O-O") return "castle kingside";
    if (clean === "O-O-O") return "castle queenside";

    const sanRegex = /([KQRBN])?([a-h]?[1-8]?x?)?([a-h][1-8])/;
    const match = clean.match(sanRegex);
    if (!match) return san;

    const pieceLetter = match[1] || "";
    const target = match[3];
    const file = target[0];
    const rank = target[1];

    const pieceNameMap: Record<string, string> = {
      K: "King",
      Q: "Queen",
      R: "Rook",
      B: "Bishop",
      N: "Knight",
    };

    if (!pieceLetter) return `Pawn to ${file}${rank}`;

    const pieceName = pieceNameMap[pieceLetter] || pieceLetter;
    return `${pieceName} to ${file}${rank}`;
  };

  // -----------------------------------------------------
  // Voice: parse transcript into chess move
  // Supports: "e4", "play e4", "knight to f3", "bishop takes c4",
  // "castle kingside", "castle queenside"
  // -----------------------------------------------------
  const parseVoiceMove = (
    transcript: string,
    game: Chess
  ): { from: string; to: string; promotion?: string } | null => {
    const text = transcript
      .toLowerCase()
      .replace(/play\s+/, "")
      .trim();

    // Castling
    if (text.includes("castle kingside") || text.includes("short castle")) {
      const castleMove = (game.moves({ verbose: true }) as Move[]).find(
        (m) => m.san === "O-O"
      );
      if (castleMove) {
        return {
          from: castleMove.from,
          to: castleMove.to,
          promotion: castleMove.promotion,
        };
      }
    }

    if (text.includes("castle queenside") || text.includes("long castle")) {
      const castleMove = (game.moves({ verbose: true }) as Move[]).find(
        (m) => m.san === "O-O-O"
      );
      if (castleMove) {
        return {
          from: castleMove.from,
          to: castleMove.to,
          promotion: castleMove.promotion,
        };
      }
    }

    // Extract squares mentioned
    const squareMatches = text.match(/([a-h][1-8])/g);
    const targetSquare =
      squareMatches && squareMatches.length > 0
        ? squareMatches[squareMatches.length - 1]
        : null;
    if (!targetSquare) return null;

    const legalMoves = game.moves({ verbose: true }) as Move[];

    // Which piece type?
    let desiredPiece: "p" | "n" | "b" | "r" | "q" | "k" | null = null;
    if (text.includes("knight")) desiredPiece = "n";
    else if (text.includes("bishop")) desiredPiece = "b";
    else if (text.includes("rook")) desiredPiece = "r";
    else if (text.includes("queen")) desiredPiece = "q";
    else if (text.includes("king")) desiredPiece = "k";

    let candidateMoves = legalMoves.filter((m) => m.to === targetSquare);

    if (desiredPiece) {
      candidateMoves = candidateMoves.filter((m) => m.piece === desiredPiece);
    }

    if (candidateMoves.length === 1) {
      const m = candidateMoves[0];
      return {
        from: m.from,
        to: m.to,
        promotion: m.promotion || "q",
      };
    }

    // Disambiguation using origin square, if spoken
    if (
      candidateMoves.length > 1 &&
      squareMatches &&
      squareMatches.length >= 2
    ) {
      const fromHint = squareMatches[0];
      const disamb = candidateMoves.find((m) => m.from === fromHint);
      if (disamb) {
        return {
          from: disamb.from,
          to: disamb.to,
          promotion: disamb.promotion || "q",
        };
      }
    }

    return null;
  };

  // -----------------------------------------------------
  // Init gameConfig + Stockfish on mount
  // -----------------------------------------------------
  useEffect(() => {
    const storedConfig = sessionStorage.getItem("gameConfig");
    if (storedConfig) {
      try {
        const config = JSON.parse(storedConfig);
        const { baseSeconds, incSeconds, label } = parseTimeControl(
          config.time
        );
        setPlayerTime(baseSeconds);
        setOpponentTime(baseSeconds);
        setIncrementSeconds(incSeconds);
        setTimeLabel(label);
      } catch (e) {
        console.warn("Failed to parse gameConfig, using 5+0", e);
      }
    }

    stockfishService
      .initialize()
      .then(() => console.log("✅ Stockfish initialized"))
      .catch((e) => console.warn("Stockfish init error:", e));

    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
      if (aiTimeoutRef.current) {
        window.clearTimeout(aiTimeoutRef.current);
      }
      stockfishService.terminate();
    };
  }, []);

  // Keep PlayerInfo time fields in sync
  useEffect(() => {
    setPlayer((p) => ({ ...p, time: playerTime }));
  }, [playerTime]);

  useEffect(() => {
    setOpponent((p) => ({ ...p, time: opponentTime }));
  }, [opponentTime]);

  // -----------------------------------------------------
  // Timer effect
  // -----------------------------------------------------
  useEffect(() => {
    if (gameStatus !== "playing") {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
      return;
    }

    timeUpHandledRef.current = false;

    timerIntervalRef.current = window.setInterval(() => {
      const turn = gameRef.current.turn(); // "w" | "b"

      if (turn === playerColor) {
        setPlayerTime((prev) => {
          if (prev <= 1) {
            if (!timeUpHandledRef.current) {
              timeUpHandledRef.current = true;
              handleTimeUp("white");
            }
            return 0;
          }
          return prev - 1;
        });
      } else {
        setOpponentTime((prev) => {
          if (prev <= 1) {
            if (!timeUpHandledRef.current) {
              timeUpHandledRef.current = true;
              handleTimeUp("black");
            }
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
    };
  }, [gameStatus]);

  const handleTimeUp = async (side: "white" | "black") => {
    setGameStatus("timeout");
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
    }

    const message =
      side === "white"
        ? "Time is up. Black wins by timeout."
        : "Time is up. White wins by timeout.";

    if (soundEnabled && speechService.isSupportedBrowser()) {
      try {
        await speechService.speak({
          text: message,
          rate: 1.0,
          volume: 0.9,
        });
      } catch (e) {
        console.warn("Failed to speak timeout message:", e);
      }
    }
  };

  // -----------------------------------------------------
  // Apply a move (player or AI)
  // -----------------------------------------------------
  const applyMove = async (
    from: string,
    to: string,
    by: "player" | "ai",
    promotion: string = "q"
  ): Promise<boolean> => {
    if (gameStatus !== "playing") return false;

    const clone = new Chess(gameRef.current.fen());
    const move = clone.move({ from, to, promotion });

    if (!move) {
      if (
        by === "player" &&
        soundEnabled &&
        speechService.isSupportedBrowser()
      ) {
        try {
          await speechService.speak({
            text: "That move is illegal. Please say another legal move.",
            rate: 1.0,
            volume: 0.9,
          });
        } catch (e) {
          console.warn("Failed to speak illegal move:", e);
        }
      }
      return false;
    }

    // increment
    if (incrementSeconds > 0) {
      if (by === "player") {
        setPlayerTime((t) => t + incrementSeconds);
      } else {
        setOpponentTime((t) => t + incrementSeconds);
      }
    }

    gameRef.current = clone;
    setGameFen(clone.fen());
    setMoveHistory((prev) => [...prev, move.san]);

    if (soundEnabled && speechService.isSupportedBrowser()) {
      const moveSpeech = sanToSpeech(move.san);
      const prefix = by === "player" ? "You played" : "Opponent played";
      try {
        await speechService.speak({
          text: `${prefix} ${moveSpeech}`,
          rate: 1.0,
          volume: 0.9,
        });
      } catch (e) {
        console.warn("Failed to speak move:", e);
      }
    }

    if (clone.isCheckmate()) {
      setGameStatus("checkmate");
      const winner =
        clone.turn() === "w"
          ? "black wins by checkmate"
          : "white wins by checkmate";
      if (soundEnabled && speechService.isSupportedBrowser()) {
        try {
          await speechService.speak({
            text: `Checkmate, ${winner}.`,
            rate: 1.0,
            volume: 0.9,
          });
        } catch (e) {
          console.warn("Failed to speak checkmate:", e);
        }
      }
    } else if (clone.isStalemate()) {
      setGameStatus("stalemate");
      if (soundEnabled && speechService.isSupportedBrowser()) {
        try {
          await speechService.speak({
            text: "The game is a stalemate.",
            rate: 1.0,
            volume: 0.9,
          });
        } catch (e) {
          console.warn("Failed to speak stalemate:", e);
        }
      }
    } else if (clone.isDraw()) {
      setGameStatus("draw");
      if (soundEnabled && speechService.isSupportedBrowser()) {
        try {
          await speechService.speak({
            text: "The game is a draw.",
            rate: 1.0,
            volume: 0.9,
          });
        } catch (e) {
          console.warn("Failed to speak draw:", e);
        }
      }
    } else if (clone.inCheck()) {
      setGameStatus("check");
      if (soundEnabled && speechService.isSupportedBrowser()) {
        try {
          await speechService.speak({
            text: "Check.",
            rate: 1.0,
            volume: 0.9,
          });
        } catch (e) {
          console.warn("Failed to speak check:", e);
        }
      }
    } else {
      setGameStatus("playing");
    }

    return true;
  };

  // Player move via board
  const handleBoardMove = async (
    from: string,
    to: string,
    promotion?: string
  ) => {
    if (gameRef.current.turn() !== playerColor) return false;
    const success = await applyMove(from, to, "player", promotion || "q");
    if (!success) return false;
    triggerAIMove();
    return true;
  };

  // -----------------------------------------------------
  // Trigger AI move (Stockfish or random)
  // -----------------------------------------------------
  const triggerAIMove = async () => {
    if (gameStatus !== "playing") return;
    if (gameRef.current.turn() !== aiColor) return;

    setIsAIThinking(true);

    aiTimeoutRef.current = window.setTimeout(async () => {
      let aiMove: StockfishMove | null = null;

      try {
        aiMove = await stockfishService.getBestMove(gameRef.current.fen(), 8);
      } catch (e) {
        console.warn("Stockfish getBestMove error:", e);
      }

      if (!aiMove) {
        const moves = gameRef.current.moves({ verbose: true }) as Move[];
        if (moves.length === 0) {
          setIsAIThinking(false);
          return;
        }
        const random = moves[Math.floor(Math.random() * moves.length)];
        aiMove = {
          from: random.from,
          to: random.to,
          promotion: random.promotion,
        };
      }

      await applyMove(aiMove.from, aiMove.to, "ai", aiMove.promotion || "q");
      setIsAIThinking(false);
    }, 600);
  };

  // -----------------------------------------------------
  // Voice recognition setup
  // -----------------------------------------------------
  const initRecognition = () => {
    if (recognitionRef.current) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("SpeechRecognition not supported.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceProgress(100);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (voiceEnabled && gameStatus === "playing") {
        try {
          recognition.start();
        } catch {
          /* ignore */
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        setCurrentTranscript(interim);
      }

      if (final) {
        const text = final.trim();
        setCurrentTranscript("");
        setDetectedCommand(text);

        const newItem: VoiceCommandHistoryItem = {
          id: Date.now().toString(),
          text,
          timestamp: new Date(),
          status: "processing",
        };

        setCommandHistory((prev) => [newItem, ...prev]);
        handleVoiceCommand(text, newItem.id);
      }
    };

    recognitionRef.current = recognition;
  };

  const startListening = () => {
    if (!voiceEnabled) return;
    initRecognition();
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.start();
    } catch {
      /* already started */
    }
  };

  const stopListening = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
      /* ignore */
    }
    setIsListening(false);
  };

  // start/cleanup listening
  useEffect(() => {
    if (voiceEnabled) {
      startListening();
    }
    return () => {
      stopListening();
      speechService.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleVoice = () => {
    if (voiceEnabled) {
      setVoiceEnabled(false);
      stopListening();
      speechService.stop();
    } else {
      setVoiceEnabled(true);
      startListening();
    }
  };

  // -----------------------------------------------------
  // Voice commands: update history status
  // -----------------------------------------------------
  const updateCommandStatus = (
    id: string,
    status: VoiceCommandHistoryItem["status"]
  ) => {
    setCommandHistory((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c))
    );
  };

  const handleVoiceCommand = async (text: string, historyId: string) => {
    const lower = text.toLowerCase();

    // simple control commands
    if (lower.includes("stop listening") || lower.includes("pause voice")) {
      updateCommandStatus(historyId, "executed");
      handleToggleVoice();
      return;
    }

    if (lower.includes("flip board")) {
      setBoardOrientation((o) => (o === "white" ? "black" : "white"));
      updateCommandStatus(historyId, "executed");
      return;
    }

    // treat as move
    const move = parseVoiceMove(lower, gameRef.current);
    if (!move) {
      updateCommandStatus(historyId, "failed");
      if (soundEnabled && speechService.isSupportedBrowser()) {
        try {
          await speechService.speak({
            text: "I could not detect a legal chess move. Please try again.",
            rate: 1.0,
            volume: 0.9,
          });
        } catch (e) {
          console.warn("Failed to speak no-move message:", e);
        }
      }
      return;
    }

    const success = await applyMove(
      move.from,
      move.to,
      "player",
      move.promotion || "q"
    );
    if (!success) {
      updateCommandStatus(historyId, "failed");
      return;
    }

    updateCommandStatus(historyId, "executed");
    triggerAIMove();
  };

  // -----------------------------------------------------
  // UI helpers
  // -----------------------------------------------------
  const handleFlipBoard = () => {
    setBoardOrientation((o) => (o === "white" ? "black" : "white"));
  };

  const handleToggleSound = () => {
    setSoundEnabled((s) => !s);
    if (soundEnabled) {
      speechService.stop();
    }
  };

  const handleUndo = () => {
    const game = gameRef.current;
    const undone = game.undo();
    if (!undone) return;
    setMoveHistory((prev) => prev.slice(0, -1));
    setGameFen(game.fen());
    setGameStatus("playing");
  };

  const handleBack = () => {
    speechService.stop();
    stopListening();
    sessionStorage.removeItem("gameConfig");
    navigate("/home");
  };

  const getStatusText = () => {
    switch (gameStatus) {
      case "playing":
        return "Speak moves like “Knight to F3” or click squares.";
      case "check":
        return "Check! Defend your king.";
      case "checkmate":
        return "Checkmate. Game over.";
      case "stalemate":
        return "Stalemate. Nobody wins.";
      case "draw":
        return "Drawn game.";
      case "timeout":
        return "Game over by time.";
      default:
        return "";
    }
  };

  return (
    <div className="voice-game-page">
      <GameHeader onBack={handleBack} />

      <div className="game-layout">
        {/* LEFT */}
        <div className="left-section">
          <div className="voice-mode-card">
            <div className="voice-mode-header">
              <span className="mode-pill">🎤 Voice Mode Active</span>
              <span className="mode-tag">⏱ {timeLabel}</span>
            </div>
            <p className="voice-mode-subtitle">{getStatusText()}</p>

            <VoiceStatusBar
              isActive={voiceEnabled && isListening}
              onToggle={handleToggleVoice}
              progress={voiceProgress}
              isAIThinking={isAIThinking}
            />
          </div>

          <div className="board-card">
            <div className="board-inner">
              <Chessboard
                gameFen={gameFen}
                onMove={handleBoardMove}
                boardOrientation={boardOrientation}
                disabled={gameStatus !== "playing" || isAIThinking}
              />
            </div>
            <div className="controls-row">
              <ControlsBar
                onFlipBoard={handleFlipBoard}
                soundOn={soundEnabled}
                onToggleSound={handleToggleSound}
                onUndo={handleUndo}
                isGameOver={gameStatus !== "playing"}
              />
            </div>
          </div>

          <div className="bottom-detected">
            <DetectedCommandBanner command={detectedCommand} />
          </div>
        </div>

        {/* RIGHT */}
        <div className="right-sidebar">
          <OpponentCard player={opponent} isThinking={isAIThinking} />
          <PlayerCard
            player={player}
            isYourTurn={gameRef.current.turn() === playerColor}
          />
          <VoiceHistory commands={commandHistory} />
          <QuickVoiceTips />
          <MoveHistory moves={moveHistory} />
        </div>
      </div>
    </div>
  );
};

export default VoiceGamePage;
