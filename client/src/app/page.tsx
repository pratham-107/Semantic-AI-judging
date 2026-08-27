'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SocketProvider, useSocketGame } from '../context/SocketContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { AuthModal } from '../components/AuthModal';
import { LobbyView } from '../components/LobbyView';
import { GameView } from '../components/GameView';
import { ChalkboardHeroCanvas } from '../components/ChalkboardHeroCanvas';
import { TornPaperDivider } from '../components/TornPaperDivider';
import { soundManager } from '../lib/soundManager';
import {
  Sparkles,
  Play,
  Users,
  Award,
  Flame,
  Zap,
  X,
  Pencil,
  BookOpen,
} from 'lucide-react';

function MainApp() {
  const { room, createRoom, joinRoom } = useSocketGame();
  const { user, isAuthenticated } = useAuth();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [playerName, setPlayerName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [roundsCount, setRoundsCount] = useState(5);
  const [roundDuration, setRoundDuration] = useState(80);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user?.username) {
      setPlayerName(user.username);
    }
  }, [user]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setErrorMsg('Please enter your student / player name.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    try {
      soundManager?.playSchoolBell();
      await createRoom(playerName.trim(), {
        totalRounds: roundsCount,
        roundDurationSec: roundDuration,
      });
      setShowCreateModal(false);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !roomCodeInput.trim()) {
      setErrorMsg('Please enter both your name and the 5-letter room code.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    try {
      soundManager?.playPop();
      await joinRoom(roomCodeInput.trim(), playerName.trim());
      setShowJoinModal(false);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };

  // If already in a room, render Lobby or active Game
  if (room) {
    return (
      <div className="min-h-screen max-w-[100vw] overflow-x-hidden bg-[#1F3D33] text-[#F6F3EA] flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col justify-center py-2 sm:py-4 md:py-6 max-w-full overflow-x-hidden">
          <AnimatePresence mode="wait">
            {room.status === 'WAITING' ? (
              <motion.div
                key="lobby"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full max-w-full overflow-x-hidden"
              >
                <LobbyView />
              </motion.div>
            ) : (
              <motion.div
                key="game"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full max-w-full overflow-x-hidden"
              >
                <GameView />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    );
  }

  // Landing Page per FRONTEND_UI.md spec with Framer Motion
  return (
    <div className="min-h-screen max-w-[100vw] overflow-x-hidden bg-[#1F3D33] flex flex-col selection:bg-[#F4B942] selection:text-[#16302A]">
      <Navbar />

      {/* 1. BLACKBOARD HERO SECTION */}
      <section className="bg-[#1F3D33] text-[#F6F3EA] pt-6 sm:pt-10 md:pt-16 pb-10 sm:pb-14 px-3 sm:px-6 md:px-8 relative max-w-full overflow-hidden">
        {/* Floating animated decorative chalk dust particles */}
        <motion.div
          animate={{ y: [-10, 10, -10], rotate: [0, 5, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
          className="absolute top-12 left-10 text-[#F4B942]/15 font-mono text-6xl select-none pointer-events-none hidden md:block"
        >
          ✦
        </motion.div>
        <motion.div
          animate={{ y: [10, -10, 10], rotate: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}
          className="absolute bottom-16 right-12 text-[#F4B942]/15 font-mono text-7xl select-none pointer-events-none hidden md:block"
        >
          ✎
        </motion.div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10 items-center">
          {/* Left Column: Headlines & CTAs */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-7 space-y-4 sm:space-y-6 text-center lg:text-left"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#16302A] text-[#F4B942] border border-[#F4B942]/30 text-[10px] sm:text-xs font-mono font-bold tracking-wider uppercase shadow"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              After-Hours Classroom · AI Judging
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold font-mono tracking-tight text-[#F6F3EA] leading-tight break-words"
            >
              Draw. Guess.{' '}
              <span className="text-[#F4B942] underline decoration-wavy decoration-[#E1533B]">
                Get judged
              </span>{' '}
              by an AI that gets what you meant.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-sm sm:text-base md:text-lg text-[#F6F3EA]/80 font-sans max-w-xl mx-auto lg:mx-0 leading-relaxed"
            >
              No more spelling rage. Guesses are scored by <strong>semantic meaning</strong>, drawers are scored by <strong>accuracy & clarity</strong>, and canvas strokes are veiled by server-side <strong>Fog of War</strong>.
            </motion.p>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-1 sm:pt-2 w-full max-w-full"
            >
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() => {
                  if (!isAuthenticated) {
                    setShowAuthModal(true);
                    soundManager?.playPop();
                    return;
                  }
                  setErrorMsg('');
                  setShowCreateModal(true);
                  soundManager?.playPop();
                }}
                className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-[#F4B942] text-[#16302A] font-mono font-bold text-sm sm:text-base rounded-xl btn-chalk hover:bg-amber-400 flex items-center justify-center gap-2 shadow-2xl"
              >
                <Pencil className="w-4 h-4 sm:w-5 sm:h-5" />
                Create Classroom
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() => {
                  if (!isAuthenticated) {
                    setShowAuthModal(true);
                    soundManager?.playPop();
                    return;
                  }
                  setErrorMsg('');
                  setShowJoinModal(true);
                  soundManager?.playPop();
                }}
                className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-[#16302A] text-[#F6F3EA] border-2 border-[#F6F3EA]/30 font-mono font-bold text-sm sm:text-base rounded-xl hover:bg-[#1F3D33] hover:border-[#F4B942] flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#F4B942]" />
                Join with Hall Pass
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Right Column: Live Self-Drawing Mini Canvas */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="lg:col-span-5 w-full max-w-full overflow-hidden"
          >
            <ChalkboardHeroCanvas />
          </motion.div>
        </div>
      </section>

      {/* Torn Spiral-Notebook Edge Divider */}
      <TornPaperDivider fillColor="#FBF6E9" bgColor="#1F3D33" />

      {/* 2. NOTEBOOK PAPER SECTION */}
      <section className="bg-[#FBF6E9] text-[#4A4A45] py-10 sm:py-14 md:py-20 px-3 sm:px-6 md:px-8 max-w-full overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2 sm:space-y-3">
            <div className="text-[11px] sm:text-xs font-mono font-bold text-[#E1533B] uppercase tracking-wider">
              Not Your Average Skribbl Clone
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-mono text-[#16302A]">
              Why SketchAI changes the game
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-[#4A4A45]/80 font-sans leading-relaxed">
              Traditional drawing games reward exact string matches and give drawers flat point rewards. SketchAI re-engineers every rule from the ground up:
            </p>
          </div>

          {/* 3-Card Classroom Feature Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Card 1: Hall Pass */}
            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ type: 'spring', damping: 15 }}
              className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-[#4A4A45]/15 shadow-md flex flex-col justify-between"
              style={{ borderRadius: '14px 16px 15px 13px' }}
            >
              <div className="space-y-2.5 sm:space-y-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-100 border border-amber-300 text-[#F4B942] flex items-center justify-center font-bold shadow-sm">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold font-mono text-[#16302A]">
                  1. Hall Pass Entry
                </h3>
                <p className="text-xs sm:text-sm text-[#4A4A45]/80 leading-relaxed font-sans">
                  Join in seconds using a short 5-letter room code. Zero signup or password hurdles required to play instantly from desktop or mobile.
                </p>
              </div>
              <div className="pt-3 mt-3 sm:pt-4 sm:mt-4 border-t border-gray-100 text-[11px] sm:text-xs font-mono text-amber-700 font-bold">
                Instant Room Plumbing
              </div>
            </motion.div>

            {/* Card 2: Chalk Dust */}
            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ type: 'spring', damping: 15 }}
              className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-[#4A4A45]/15 shadow-md flex flex-col justify-between"
              style={{ borderRadius: '15px 13px 16px 14px' }}
            >
              <div className="space-y-2.5 sm:space-y-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-100 border border-blue-300 text-[#3E6FD9] flex items-center justify-center font-bold shadow-sm">
                  <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-[#3E6FD9]" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold font-mono text-[#16302A]">
                  2. Semantic Judging & Warmth
                </h3>
                <p className="text-xs sm:text-sm text-[#4A4A45]/80 leading-relaxed font-sans">
                  Sentence embeddings calculate semantic similarity. Guessing <em>puppy</em> for <em>dog</em> yields 84% warmth and partial credit points instead of silence.
                </p>
              </div>
              <div className="pt-3 mt-3 sm:pt-4 sm:mt-4 border-t border-gray-100 text-[11px] sm:text-xs font-mono text-[#3E6FD9] font-bold">
                sentence-transformers AI
              </div>
            </motion.div>

            {/* Card 3: Report Card */}
            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ type: 'spring', damping: 15 }}
              className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-[#4A4A45]/15 shadow-md flex flex-col justify-between"
              style={{ borderRadius: '13px 15px 14px 16px' }}
            >
              <div className="space-y-2.5 sm:space-y-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-100 border border-red-300 text-[#E1533B] flex items-center justify-center font-bold shadow-sm">
                  <Award className="w-5 h-5 sm:w-6 sm:h-6 text-[#E1533B]" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold font-mono text-[#16302A]">
                  3. Drawer Accuracy Formula
                </h3>
                <p className="text-xs sm:text-sm text-[#4A4A45]/80 leading-relaxed font-sans">
                  The drawer&apos;s score is a product of <strong>participation ratio</strong> and <strong>average guess speed</strong>, directly rewarding clear drawing over lucky guesses.
                </p>
              </div>
              <div className="pt-3 mt-3 sm:pt-4 sm:mt-4 border-t border-gray-100 text-[11px] sm:text-xs font-mono text-[#E1533B] font-bold">
                Participation × Speed Factor
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Torn Spiral-Notebook Edge Divider (Flipped) */}
      <TornPaperDivider fillColor="#1F3D33" bgColor="#FBF6E9" flip />

      {/* 3. BLACKBOARD FEATURE DEEP-DIVE */}
      <section className="bg-[#1F3D33] text-[#F6F3EA] py-10 sm:py-14 md:py-20 px-3 sm:px-6 md:px-8 max-w-full overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-center">
          <div className="space-y-3 sm:space-y-4">
            <div className="text-[11px] sm:text-xs font-mono font-bold text-[#F4B942] uppercase tracking-wider">
              Server-Authoritative Fog of War
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-mono text-[#F6F3EA]">
              Filtered at the network layer, not just in CSS.
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-[#F6F3EA]/80 font-sans leading-relaxed">
              Unlike ordinary web games that rely on client-side masks, SketchAI evaluates revealed stroke coordinates on the Node.js game server. Guessers never receive hidden coordinate data over WebSockets until revealed.
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-[10px] sm:text-xs font-mono text-[#F4B942]">
              <span className="bg-[#16302A] px-2.5 py-1 rounded-lg border border-[#F6F3EA]/10 shadow-sm">
                ● Node.js + Socket.io
              </span>
              <span className="bg-[#16302A] px-2.5 py-1 rounded-lg border border-[#F6F3EA]/10 shadow-sm">
                ● FastAPI Semantic Judge
              </span>
              <span className="bg-[#16302A] px-2.5 py-1 rounded-lg border border-[#F6F3EA]/10 shadow-sm">
                ● PostgreSQL Matches
              </span>
            </div>
          </div>

          <motion.div
            whileHover={{ scale: 1.01 }}
            className="bg-[#16302A] border-2 border-[#F6F3EA]/20 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-3 sm:space-y-4 font-mono text-[11px] sm:text-xs text-[#F6F3EA]/80 overflow-x-auto"
          >
            <div className="text-[#F4B942] font-bold pb-2 border-b border-[#F6F3EA]/10 flex items-center justify-between">
              <span>authoritative_scoring.py</span>
              <span className="text-[10px] text-green-400">● LIVE FORMULA</span>
            </div>
            <div className="space-y-1 text-slate-300 leading-relaxed break-words">
              <p className="text-[#F4B942]"># Drawer Accuracy Formula</p>
              <p>participation = correct_count / total_guessers</p>
              <p>speed_factor = 1.0 - (avg_time / round_duration)</p>
              <p>drawer_score = max_pts * participation * (0.5 + 0.5 * speed_factor)</p>
              <p className="pt-2 text-[#F4B942]"># Semantic Cosine Similarity Thresholds</p>
              <p>if similarity &gt;= 0.95: return FullGuesserPoints()</p>
              <p>elif similarity &gt;= 0.75: return PartialCreditPoints()</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#16302A] text-[#F6F3EA]/70 py-6 sm:py-8 px-3 sm:px-6 md:px-8 border-t border-[#F6F3EA]/10 text-[11px] sm:text-xs font-mono max-w-full overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-center sm:text-left">
          <div>
            <span className="font-bold text-[#F4B942]">SketchAI</span> — Semantic AI Drawing & Guessing Game
          </div>
          <div className="flex items-center gap-3">
            <span>React + Next.js</span>
            <span>·</span>
            <span>FastAPI AI Microservice</span>
            <span>·</span>
            <span>MIT License</span>
          </div>
        </div>
      </footer>

      {/* CREATE ROOM MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', damping: 20 }}
              className="bg-[#1F3D33] text-[#F6F3EA] max-w-md w-full max-h-[90vh] overflow-y-auto rounded-2xl p-5 sm:p-6 border-4 border-[#5A3825] shadow-2xl relative space-y-4"
            >
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 text-[#F6F3EA]/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg sm:text-xl font-bold font-mono text-[#F4B942] flex items-center gap-2">
                <Pencil className="w-5 h-5" /> Create Classroom Room
              </h3>

              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-2.5 rounded-lg bg-red-950 border border-red-500 text-red-300 text-xs"
                >
                  {errorMsg}
                </motion.div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs font-mono">
                <div>
                  <label className="block text-[#F6F3EA]/80 font-bold mb-1">
                    Your Student / Host Name:
                  </label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="e.g. Pratham"
                    className="w-full px-3 py-2.5 bg-[#16302A] text-[#F6F3EA] rounded-xl border border-[#F6F3EA]/20 focus:outline-none focus:border-[#F4B942] text-sm"
                    maxLength={20}
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#F6F3EA]/80 font-bold mb-1">
                      Total Rounds:
                    </label>
                    <select
                      value={roundsCount}
                      onChange={(e) => setRoundsCount(Number(e.target.value))}
                      className="w-full px-3 py-2.5 bg-[#16302A] text-[#F6F3EA] rounded-xl border border-[#F6F3EA]/20 focus:outline-none focus:border-[#F4B942]"
                    >
                      <option value={3}>3 Rounds</option>
                      <option value={5}>5 Rounds</option>
                      <option value={8}>8 Rounds</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#F6F3EA]/80 font-bold mb-1">
                      Round Timer:
                    </label>
                    <select
                      value={roundDuration}
                      onChange={(e) => setRoundDuration(Number(e.target.value))}
                      className="w-full px-3 py-2.5 bg-[#16302A] text-[#F6F3EA] rounded-xl border border-[#F6F3EA]/20 focus:outline-none focus:border-[#F4B942]"
                    >
                      <option value={60}>60 Seconds</option>
                      <option value={80}>80 Seconds</option>
                      <option value={100}>100 Seconds</option>
                    </select>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-[#F4B942] text-[#16302A] font-bold rounded-xl btn-chalk hover:bg-amber-400 text-sm shadow flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                >
                  {isLoading ? 'Creating Room...' : 'Open Classroom Lobby'}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* JOIN ROOM MODAL */}
      <AnimatePresence>
        {showJoinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', damping: 20 }}
              className="bg-[#1F3D33] text-[#F6F3EA] max-w-md w-full max-h-[90vh] overflow-y-auto rounded-2xl p-5 sm:p-6 border-4 border-[#5A3825] shadow-2xl relative space-y-4"
            >
              <button
                type="button"
                onClick={() => setShowJoinModal(false)}
                className="absolute top-4 right-4 text-[#F6F3EA]/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg sm:text-xl font-bold font-mono text-[#F4B942] flex items-center gap-2">
                <BookOpen className="w-5 h-5" /> Join with Hall Pass
              </h3>

              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-2.5 rounded-lg bg-red-950 border border-red-500 text-red-300 text-xs"
                >
                  {errorMsg}
                </motion.div>
              )}

              <form onSubmit={handleJoinSubmit} className="space-y-3.5 text-xs font-mono">
                <div>
                  <label className="block text-[#F6F3EA]/80 font-bold mb-1">
                    5-Letter Room Code:
                  </label>
                  <input
                    type="text"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. AB3XQ"
                    className="w-full px-3 py-2.5 bg-[#16302A] text-[#F6F3EA] rounded-xl border border-[#F6F3EA]/20 focus:outline-none focus:border-[#F4B942] text-sm uppercase tracking-widest font-bold"
                    maxLength={5}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[#F6F3EA]/80 font-bold mb-1">
                    Your Student Name:
                  </label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="e.g. Sarah"
                    className="w-full px-3 py-2.5 bg-[#16302A] text-[#F6F3EA] rounded-xl border border-[#F6F3EA]/20 focus:outline-none focus:border-[#F4B942] text-sm"
                    maxLength={20}
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-[#F4B942] text-[#16302A] font-bold rounded-xl btn-chalk hover:bg-amber-400 text-sm shadow flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                >
                  {isLoading ? 'Joining...' : 'Take a Seat in Class'}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Student Authentication Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}

export default function HomePage() {
  return (
    <AuthProvider>
      <SocketProvider>
        <MainApp />
      </SocketProvider>
    </AuthProvider>
  );
}
