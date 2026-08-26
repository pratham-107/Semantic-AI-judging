'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useSocketGame } from '../context/SocketContext';
import { soundManager } from '../lib/soundManager';
import { Trophy, Medal, RotateCcw, Home, Sparkles } from 'lucide-react';

export function GameEndModal() {
  const { gameEndData, isHost, restartGame, leaveRoom } = useSocketGame();

  useEffect(() => {
    if (!gameEndData) return;

    soundManager?.playCorrectChime();

    // Trigger celebratory confetti
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });

    const timer = setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 65,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 65,
        origin: { x: 1 },
      });
    }, 450);

    return () => clearTimeout(timer);
  }, [gameEndData]);

  if (!gameEndData) return null;

  const { finalScores, winner } = gameEndData;
  const top3 = finalScores.slice(0, 3);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.7, y: 50, rotate: 2 }}
          animate={{ scale: 1, y: 0, rotate: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 16, stiffness: 220 }}
          className="bg-[#1F3D33] text-[#F6F3EA] max-w-lg w-full rounded-2xl p-6 border-4 border-[#5A3825] shadow-2xl space-y-6 text-center"
        >
          {/* Header */}
          <div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#F4B942] text-[#16302A] text-xs font-mono font-bold uppercase mb-2 shadow"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Class Dismissed · Game Over
            </motion.div>
            <h2 className="text-2xl md:text-3xl font-bold font-mono text-[#F4B942]">
              Valedictorian: {winner.playerName}! 🏆
            </h2>
            <p className="text-xs text-[#F6F3EA]/70 mt-1 font-sans">
              Final match scores computed with semantic guess judging and drawer accuracy.
            </p>
          </div>

          {/* Animated Podium */}
          <div className="grid grid-cols-3 gap-2 items-end pt-4 pb-2">
            {/* 2nd Place */}
            {top3[1] && (
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, type: 'spring' }}
                className="bg-[#16302A] border border-[#F6F3EA]/20 rounded-xl p-3 flex flex-col items-center"
              >
                <Medal className="w-6 h-6 text-slate-300 mb-1" />
                <span className="text-xs font-bold text-slate-300 font-mono">2nd</span>
                <span className="text-xs font-sans font-bold text-[#F6F3EA] truncate w-full">
                  {top3[1].playerName}
                </span>
                <span className="text-[11px] font-mono text-slate-400 mt-1">
                  {top3[1].totalScore} pts
                </span>
              </motion.div>
            )}

            {/* 1st Place (Center / Taller) */}
            {top3[0] && (
              <motion.div
                initial={{ y: 70, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="bg-[#16302A] border-2 border-[#F4B942] rounded-xl p-4 flex flex-col items-center shadow-2xl -mt-4 bg-amber-500/10 ring-4 ring-[#F4B942]/20"
              >
                <Trophy className="w-9 h-9 text-amber-400 mb-1 animate-bounce" />
                <span className="text-xs font-bold text-amber-400 font-mono">1st Place</span>
                <span className="text-sm font-sans font-bold text-[#F4B942] truncate w-full">
                  {top3[0].playerName}
                </span>
                <span className="text-xs font-mono text-[#F6F3EA] font-bold mt-1 bg-black/40 px-2.5 py-0.5 rounded shadow">
                  {top3[0].totalScore} pts
                </span>
              </motion.div>
            )}

            {/* 3rd Place */}
            {top3[2] && (
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, type: 'spring' }}
                className="bg-[#16302A] border border-[#F6F3EA]/20 rounded-xl p-3 flex flex-col items-center"
              >
                <Medal className="w-6 h-6 text-amber-700 mb-1" />
                <span className="text-xs font-bold text-amber-700 font-mono">3rd</span>
                <span className="text-xs font-sans font-bold text-[#F6F3EA] truncate w-full">
                  {top3[2].playerName}
                </span>
                <span className="text-[11px] font-mono text-slate-400 mt-1">
                  {top3[2].totalScore} pts
                </span>
              </motion.div>
            )}
          </div>

          {/* Full Leaderboard */}
          <div className="bg-[#16302A] rounded-xl p-3 border border-[#F6F3EA]/10 text-left max-h-36 overflow-y-auto space-y-1">
            {finalScores.map((s, idx) => (
              <div
                key={s.playerId}
                className="flex items-center justify-between text-xs font-mono py-1 px-2 rounded hover:bg-[#1F3D33]"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[#F4B942] font-bold w-4">#{idx + 1}</span>
                  <span className="font-sans text-[#F6F3EA]">{s.playerName}</span>
                </div>
                <span className="font-bold text-[#F6F3EA]">{s.totalScore} pts</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            {isHost && (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() => {
                  soundManager?.playPop();
                  restartGame();
                }}
                className="flex-1 py-3.5 bg-[#F4B942] text-[#16302A] font-mono font-bold rounded-xl btn-chalk hover:bg-amber-400 text-xs flex items-center justify-center gap-2 shadow"
              >
                <RotateCcw className="w-4 h-4" />
                Play Again
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={() => {
                soundManager?.playPop();
                leaveRoom();
              }}
              className="flex-1 py-3.5 bg-[#16302A] text-[#F6F3EA] border border-[#F6F3EA]/20 font-mono font-bold rounded-xl hover:bg-[#1F3D33] text-xs flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Back to Classroom
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
