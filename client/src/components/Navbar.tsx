'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocketGame } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../lib/soundManager';
import { AuthModal } from './AuthModal';
import {
  Pencil,
  HelpCircle,
  LogOut,
  Sparkles,
  X,
  Volume2,
  VolumeX,
  User,
  GraduationCap,
  Trophy,
} from 'lucide-react';

export function Navbar() {
  const { connected, room, leaveRoom } = useSocketGame();
  const { user, stats, isAuthenticated, logout } = useAuth();

  const [showRules, setShowRules] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(true);

  useEffect(() => {
    const syncMusic = () => {
      if (soundManager) {
        setIsMusicPlaying(soundManager.isPlaying() || soundManager.isMusicEnabled());
      }
    };
    syncMusic();
    const interval = setInterval(syncMusic, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleMusic = () => {
    if (soundManager) {
      const playing = soundManager.toggleBackgroundMusic();
      setIsMusicPlaying(playing);
      soundManager.playPop();
    }
  };

  return (
    <>
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full bg-[#16302A] text-[#F6F3EA] border-b border-[#F6F3EA]/15 sticky top-0 z-40 px-3 sm:px-6 md:px-8 py-2 sm:py-2.5 shadow-md backdrop-blur-md"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Logo with playful bounce */}
          <motion.div
            className="flex items-center gap-2 sm:gap-3 cursor-pointer shrink-0"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => soundManager?.playPop()}
          >
            <motion.div
              animate={{ rotate: [-3, 3, -3] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#F4B942] text-[#16302A] flex items-center justify-center font-bold shadow-md"
            >
              <Pencil className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-2xl font-bold tracking-tight font-mono text-[#F6F3EA]">
                  Sketch<span className="text-[#F4B942]">AI</span>
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#1F3D33] text-[#F4B942] border border-[#F4B942]/30 font-bold hidden md:inline">
                  Classroom Edition
                </span>
              </div>
            </div>
          </motion.div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Background Music Toggle Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={handleToggleMusic}
              className={`flex items-center gap-1 text-[11px] sm:text-xs font-mono font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border transition-all shadow-sm ${
                isMusicPlaying
                  ? 'bg-amber-400/20 text-[#F4B942] border-[#F4B942]'
                  : 'bg-[#1F3D33] text-[#F6F3EA]/70 border-[#F6F3EA]/20 hover:text-white'
              }`}
              title={isMusicPlaying ? 'Mute Lo-Fi Classroom Music' : 'Play Lo-Fi Classroom Music'}
            >
              {isMusicPlaying ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F4B942] animate-bounce" />
                  <div className="flex items-end gap-0.5 h-2.5 sm:h-3">
                    <span className="w-0.5 h-2 bg-[#F4B942] animate-pulse" />
                    <span className="w-0.5 h-3 bg-[#F4B942] animate-pulse delay-75" />
                    <span className="w-0.5 h-1.5 bg-[#F4B942] animate-pulse delay-150" />
                  </div>
                  <span className="hidden lg:inline">Music</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden lg:inline">Muted</span>
                </>
              )}
            </motion.button>

            {/* Server Connection Status */}
            <div className="flex items-center gap-1 text-xs font-mono bg-[#1F3D33] px-2 py-1 rounded-lg border border-[#F6F3EA]/10">
              <span
                className={`w-2 h-2 rounded-full ${
                  connected ? 'bg-green-400 shadow-[0_0_8px_#4ade80]' : 'bg-amber-400 animate-ping'
                }`}
              />
              <span className="text-[#F6F3EA]/80 text-[10px] sm:text-[11px] hidden sm:inline">
                {connected ? 'Live' : 'Connecting...'}
              </span>
            </div>

            {/* Rules Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => {
                setShowRules(true);
                soundManager?.playPop();
              }}
              className="flex items-center gap-1 text-[11px] sm:text-xs font-mono font-bold text-[#F6F3EA]/90 bg-[#1F3D33] hover:bg-[#1F3D33]/80 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-[#F6F3EA]/20 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#F4B942]" />
              <span className="hidden sm:inline">Rules</span>
            </motion.button>

            {/* User Profile / Login Button */}
            {isAuthenticated && user ? (
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-1.5 bg-[#1F3D33] border border-[#F4B942]/40 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-mono font-bold text-[#F6F3EA] shadow"
                >
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#F4B942] text-[#16302A] flex items-center justify-center text-[9px] sm:text-[10px]">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[70px] sm:max-w-[90px] truncate">{user.username}</span>
                </motion.button>

                {/* Profile dropdown */}
                <AnimatePresence>
                  {showProfileMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-48 sm:w-52 bg-[#16302A] border border-[#F6F3EA]/20 rounded-xl p-3 shadow-2xl z-50 space-y-2 text-xs font-mono"
                    >
                      <div className="pb-2 border-b border-[#F6F3EA]/10">
                        <div className="font-bold text-[#F4B942] truncate">{user.username}</div>
                        <div className="text-[10px] text-[#F6F3EA]/60 truncate">{user.email || 'Student Desk'}</div>
                      </div>

                      {stats && (
                        <div className="space-y-1 text-[11px] text-[#F6F3EA]/80">
                          <div className="flex justify-between">
                            <span>Matches:</span>
                            <span className="font-bold text-white">{stats.matches_played}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Wins:</span>
                            <span className="font-bold text-amber-300">🏆 {stats.wins}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>High Score:</span>
                            <span className="font-bold text-green-400">{stats.high_score} pts</span>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setShowProfileMenu(false);
                          soundManager?.playPop();
                        }}
                        className="w-full pt-2 border-t border-[#F6F3EA]/10 text-left text-red-400 hover:text-red-300 flex items-center gap-1.5 text-xs"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => {
                  setShowAuthModal(true);
                  soundManager?.playPop();
                }}
                className="flex items-center gap-1 text-[11px] sm:text-xs font-mono font-bold bg-[#F4B942] text-[#16302A] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg btn-chalk hover:bg-amber-400 shadow"
              >
                <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Log In</span>
              </motion.button>
            )}

            {/* If in room: Room Code & Leave */}
            {room && (
              <div className="flex items-center gap-1 sm:gap-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="font-mono text-[11px] sm:text-xs bg-[#F4B942] text-[#16302A] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded font-bold shadow truncate"
                >
                  {room.roomCode}
                </motion.div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => {
                    leaveRoom();
                    soundManager?.playPop();
                  }}
                  className="flex items-center gap-1 text-[11px] sm:text-xs font-mono font-bold bg-[#E1533B] text-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded hover:bg-red-600 transition-colors shadow"
                  title="Leave Room"
                >
                  <LogOut className="w-3 h-3" />
                  <span className="hidden sm:inline">Leave</span>
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </motion.header>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Classroom Rules Modal */}
      <AnimatePresence>
        {showRules && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', damping: 20 }}
              className="bg-[#1F3D33] text-[#F6F3EA] max-w-lg w-full max-h-[85vh] overflow-y-auto rounded-2xl p-5 sm:p-6 border-4 border-[#5A3825] shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setShowRules(false)}
                className="absolute top-4 right-4 text-[#F6F3EA]/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-[#F4B942]" />
                <h3 className="text-lg sm:text-xl font-bold font-mono text-[#F4B942]">
                  SketchAI Classroom Rules
                </h3>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-[#F6F3EA]/90 leading-relaxed font-sans">
                <div className="bg-[#16302A] p-3 rounded-xl border border-[#F6F3EA]/10">
                  <h4 className="font-bold text-[#F4B942] mb-1 font-mono">
                    1. Semantic Guessing (No exact spelling rage!)
                  </h4>
                  <p>
                    Guesses are judged by meaning using sentence embeddings. If the secret word is <strong>dog</strong>, guessing <em>puppy</em> gives partial points and hot warmth feedback!
                  </p>
                </div>

                <div className="bg-[#16302A] p-3 rounded-xl border border-[#F6F3EA]/10">
                  <h4 className="font-bold text-[#F4B942] mb-1 font-mono">
                    2. Drawer Accuracy Scoring
                  </h4>
                  <p>
                    The drawer does not get a flat reward. Their score depends on <strong>how many</strong> players guess correctly and <strong>how fast on average</strong>. Draw clearly to score big!
                  </p>
                </div>

                <div className="bg-[#16302A] p-3 rounded-xl border border-[#F6F3EA]/10">
                  <h4 className="font-bold text-[#F4B942] mb-1 font-mono">
                    3. Fog of War Reveal
                  </h4>
                  <p>
                    Guessers only see strokes near recently drawn areas. As the round timer ticks down, the fog slowly lifts!
                  </p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => {
                  setShowRules(false);
                  soundManager?.playPop();
                }}
                className="mt-4 w-full py-2.5 bg-[#F4B942] text-[#16302A] font-bold font-mono rounded-xl btn-chalk hover:bg-amber-400 text-xs sm:text-sm"
              >
                Got it, let&apos;s play!
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
