'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Snowflake, Sparkles, CheckCircle2 } from 'lucide-react';
import { GuessResultPayload } from '../types/game.types';
import { soundManager } from '../lib/soundManager';

interface WarmthGaugeProps {
  lastResult: GuessResultPayload | null;
}

export function WarmthGauge({ lastResult }: WarmthGaugeProps) {
  const warmth = lastResult?.warmth ?? 0;
  const isCorrect = lastResult?.correct ?? false;

  useEffect(() => {
    if (!lastResult) return;
    if (lastResult.correct) {
      soundManager?.playCorrectChime();
    } else if (lastResult.warmth >= 75) {
      soundManager?.playHotGuess();
    }
  }, [lastResult]);

  const getWarmthData = () => {
    if (isCorrect || warmth >= 95) {
      return {
        label: '🎯 BINGO! Exact Match!',
        color: '#22C55E',
        bgColor: 'bg-green-500',
        textColor: 'text-green-400',
        icon: <CheckCircle2 className="w-5 h-5 text-green-400" />,
      };
    }
    if (warmth >= 75) {
      return {
        label: '🔥 HOT! Almost there! (Partial credit)',
        color: '#E1533B',
        bgColor: 'bg-red-500',
        textColor: 'text-red-400',
        icon: <Flame className="w-5 h-5 text-red-400" />,
      };
    }
    if (warmth >= 50) {
      return {
        label: '🌤️ Warm & Getting Closer...',
        color: '#F4B942',
        bgColor: 'bg-amber-500',
        textColor: 'text-amber-300',
        icon: <Sparkles className="w-5 h-5 text-amber-300" />,
      };
    }
    if (warmth >= 25) {
      return {
        label: '⛅ Lukewarm / Distant meaning',
        color: '#3E6FD9',
        bgColor: 'bg-blue-500',
        textColor: 'text-blue-300',
        icon: <Sparkles className="w-5 h-5 text-blue-300" />,
      };
    }
    return {
      label: '❄️ Freezing Cold...',
      color: '#64748B',
      bgColor: 'bg-slate-600',
      textColor: 'text-slate-400',
      icon: <Snowflake className="w-5 h-5 text-slate-400" />,
    };
  };

  const current = getWarmthData();

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-[#16302A] border border-[#F6F3EA]/20 rounded-xl p-3.5 shadow-lg relative overflow-hidden"
    >
      {/* Background glow when hot */}
      {warmth >= 75 && (
        <motion.div
          animate={{ opacity: [0.1, 0.25, 0.1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="absolute inset-0 bg-red-500/20 pointer-events-none rounded-xl"
        />
      )}

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <motion.div
            key={warmth}
            initial={{ scale: 0.5, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 10 }}
          >
            {current.icon}
          </motion.div>
          <span className="text-xs font-mono tracking-wider uppercase text-[#F6F3EA]/80 font-bold">
            Semantic AI Warmth
          </span>
        </div>
        <motion.div
          key={warmth}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          className="font-mono text-sm font-bold text-[#F6F3EA] bg-black/40 px-2 py-0.5 rounded border border-[#F6F3EA]/10 shadow-inner"
        >
          {warmth}%
        </motion.div>
      </div>

      {/* Animated Thermometer Bar */}
      <div className="relative h-4 bg-black/50 rounded-full overflow-hidden border border-[#F6F3EA]/20 p-0.5">
        <motion.div
          className={`h-full rounded-full ${current.bgColor} shadow-md`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(6, warmth)}%` }}
          transition={{ type: 'spring', damping: 18, stiffness: 200 }}
        />
      </div>

      {/* Semantic Status Label */}
      <div className="flex items-center justify-between mt-2 text-xs">
        <AnimatePresence mode="wait">
          <motion.span
            key={current.label}
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -5, opacity: 0 }}
            className={`font-semibold ${current.textColor}`}
          >
            {current.label}
          </motion.span>
        </AnimatePresence>

        {lastResult && lastResult.pointsAwarded > 0 && (
          <motion.span
            initial={{ scale: 0, y: 10 }}
            animate={{ scale: 1.1, y: 0 }}
            transition={{ type: 'spring', damping: 10 }}
            className="font-mono font-bold text-amber-300"
          >
            +{lastResult.pointsAwarded} pts!
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}
