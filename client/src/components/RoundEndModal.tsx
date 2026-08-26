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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.75, y: 30, rotate: -2 }}
          animate={{ scale: 1, y: 0, rotate: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 260 }}
          className="bg-[#1F3D33] text-[#F6F3EA] max-w-xl w-full rounded-2xl p-6 border-4 border-[#5A3825] shadow-2xl space-y-5"
        >
          {/* Header */}
          <div className="text-center pb-3 border-b border-[#F6F3EA]/15">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#F4B942] text-[#16302A] text-xs font-mono font-bold uppercase mb-2 shadow"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Report Card · Round Ended
            </motion.div>
            <h2 className="text-xl md:text-2xl font-mono text-[#F6F3EA]">
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#16302A] p-4 rounded-xl border border-[#F6F3EA]/15 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#F4B942]" />
                <span className="font-mono font-bold text-sm text-[#F6F3EA]">
                  Drawer Accuracy Score ({drawerName})
                </span>
              </div>
              <span className="font-mono font-bold text-base text-amber-300">
                +{drawerBonus} pts
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-[#1F3D33] p-2.5 rounded-lg border border-[#F6F3EA]/10 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-[#F6F3EA]/60 text-[10px]">Participation</div>
                  <div className="font-bold text-[#F6F3EA]">
                    {stats.correctCount} / {stats.totalGuessers} ({Math.round(stats.participationRatio * 100)}%)
                  </div>
                </div>
              </div>

              <div className="bg-[#1F3D33] p-2.5 rounded-lg border border-[#F6F3EA]/10 flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-400" />
                <div>
                  <div className="text-[#F6F3EA]/60 text-[10px]">Avg Guess Speed</div>
                  <div className="font-bold text-[#F6F3EA]">
                    {stats.avgTimeTakenSec}s (factor {stats.speedFactor})
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#F6F3EA]/60 italic">
              Formula: maxPoints × participationRatio × (0.5 + 0.5 × speedFactor). Clarity rewarded!
            </p>
          </motion.div>

          {/* Standings list */}
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F4B942] mb-2">
              Updated Classroom Standings
            </h4>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {scores.map((s, idx) => (
                <div
                  key={s.playerId}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#16302A] text-xs font-mono border border-[#F6F3EA]/10"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 font-bold text-[#F4B942]">#{idx + 1}</span>
                    <span className="font-sans font-bold text-[#F6F3EA]">{s.playerName}</span>
                    {s.roundScore > 0 && (
                      <span className="text-green-400 font-bold text-[11px]">
                        (+{s.roundScore})
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-[#F6F3EA] bg-black/40 px-2 py-0.5 rounded">
                    {s.totalScore} pts
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Next Round Timer footer */}
          <div className="text-center pt-2 border-t border-[#F6F3EA]/10 text-xs font-mono text-[#F4B942] font-semibold flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            Next round starting in {countdown}s...
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
