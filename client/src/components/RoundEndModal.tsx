'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocketGame } from '../context/SocketContext';
import { soundManager } from '../lib/soundManager';
import { Award, Clock, Users, Sparkles } from 'lucide-react';

export function RoundEndModal() {
  const { roundEndData, currentPlayer } = useSocketGame();
  const [countdown, setCountdown] = useState(6);

  useEffect(() => {
    if (!roundEndData) return;
    soundManager?.playSchoolBell();
    setCountdown(6);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [roundEndData]);

  if (!roundEndData) return null;

  const { word, stats, drawerBonus, drawerName, scores } = roundEndData;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.8, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="bg-[#1F3D33] text-[#F6F3EA] max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6 border-4 border-[#5A3825] shadow-2xl space-y-4"
        >
          {/* Header */}
          <div className="text-center pb-2 border-b border-[#F6F3EA]/15">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#F4B942] text-[#16302A] text-[10px] sm:text-xs font-mono font-bold uppercase mb-1.5 shadow"
            >
              <Sparkles className="w-3 h-3" />
              Round Ended
            </motion.div>
            <h2 className="text-lg sm:text-2xl font-mono text-[#F6F3EA]">
              The secret word was:{' '}
              <motion.span
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-[#F4B942] font-bold uppercase underline decoration-wavy decoration-[#E1533B]"
              >
                {word}
              </motion.span>
            </h2>
          </div>

          {/* Drawer Accuracy Formula Breakdown Card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#16302A] p-3 rounded-xl border border-[#F6F3EA]/15 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#F4B942]" />
                <span className="font-mono font-bold text-xs sm:text-sm text-[#F6F3EA]">
                  Drawer Bonus ({drawerName})
                </span>
              </div>
              <span className="font-mono font-bold text-sm sm:text-base text-amber-300">
                +{drawerBonus} pts
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-[#1F3D33] p-2 rounded-lg border border-[#F6F3EA]/10 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <div className="truncate">
                  <div className="text-[#F6F3EA]/60 text-[9px]">Participation</div>
                  <div className="font-bold text-[#F6F3EA] text-[11px]">
                    {stats.correctCount} / {stats.totalGuessers} ({Math.round(stats.participationRatio * 100)}%)
                  </div>
                </div>
              </div>

              <div className="bg-[#1F3D33] p-2 rounded-lg border border-[#F6F3EA]/10 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-green-400 shrink-0" />
                <div className="truncate">
                  <div className="text-[#F6F3EA]/60 text-[9px]">Avg Speed</div>
                  <div className="font-bold text-[#F6F3EA] text-[11px]">
                    {stats.avgTimeTakenSec}s (fac {stats.speedFactor})
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-[#F6F3EA]/60 italic">
              Formula: maxPoints × participationRatio × (0.5 + 0.5 × speedFactor).
            </p>
          </motion.div>

          {/* Standings list */}
          <div>
            <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#F4B942] mb-1.5">
              Classroom Standings
            </h4>
            <div className="max-h-32 sm:max-h-40 overflow-y-auto space-y-1 pr-1">
              {scores.map((s, idx) => (
                <div
                  key={s.playerId}
                  className="flex items-center justify-between p-1.5 sm:p-2 rounded-lg bg-[#16302A] text-xs font-mono border border-[#F6F3EA]/10"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-4 font-bold text-[#F4B942]">#{idx + 1}</span>
                    <span className="font-sans font-bold text-[#F6F3EA] truncate">{s.playerName}</span>
                    {s.roundScore > 0 && (
                      <span className="text-green-400 font-bold text-[10px]">
                        (+{s.roundScore})
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-[#F6F3EA] bg-black/40 px-2 py-0.5 rounded shrink-0">
                    {s.totalScore} pts
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Next Round Timer footer */}
          <div className="text-center pt-2 border-t border-[#F6F3EA]/10 text-xs font-mono text-[#F4B942] font-semibold flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            Next round in {countdown}s...
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
