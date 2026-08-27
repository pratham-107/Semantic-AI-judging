'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../lib/soundManager';
import { X, LogIn, UserPlus, Sparkles, GraduationCap, Lock, Mail, User } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        if (!email.trim() || !password) {
          throw new Error('Please fill in your username/email and password.');
        }
        await login(email.trim(), password);
      } else {
        if (!username.trim() || !email.trim() || !password) {
          throw new Error('Please fill in all registration fields.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        await register(username.trim(), email.trim(), password);
      }

      soundManager?.playCorrectChime();
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.85, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="bg-[#1F3D33] text-[#F6F3EA] max-w-md w-full rounded-2xl p-6 border-4 border-[#5A3825] shadow-2xl relative space-y-5"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => {
              soundManager?.playPop();
              onClose();
            }}
            className="absolute top-4 right-4 text-[#F6F3EA]/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-[#F4B942]" />
            <h3 className="text-xl font-bold font-mono text-[#F4B942]">
              {mode === 'login' ? 'Student Desk Login' : 'Register Student Desk'}
            </h3>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-[#16302A] p-1 border border-[#F6F3EA]/10 font-mono text-xs">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
                soundManager?.playPop();
              }}
              className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-[#F4B942] text-[#16302A] shadow'
                  : 'text-[#F6F3EA]/70 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg('');
                soundManager?.playPop();
              }}
              className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? 'bg-[#F4B942] text-[#16302A] shadow'
                  : 'text-[#F6F3EA]/70 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              New Student
            </button>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-2.5 rounded-lg bg-red-950 border border-red-500 text-red-300 text-xs font-mono"
            >
              {errorMsg}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-mono">
            {mode === 'register' && (
              <div>
                <label className="block text-[#F6F3EA]/80 font-bold mb-1">
                  Student Display Name:
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#F6F3EA]/40 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. Pratham"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#16302A] text-[#F6F3EA] rounded-xl border border-[#F6F3EA]/20 focus:outline-none focus:border-[#F4B942] text-sm"
                    maxLength={20}
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[#F6F3EA]/80 font-bold mb-1">
                {mode === 'login' ? 'Email or Username:' : 'Email Address:'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#F6F3EA]/40 absolute left-3 top-3" />
                <input
                  type={mode === 'login' ? 'text' : 'email'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={mode === 'login' ? 'student@school.com or username' : 'student@school.com'}
                  className="w-full pl-9 pr-3 py-2.5 bg-[#16302A] text-[#F6F3EA] rounded-xl border border-[#F6F3EA]/20 focus:outline-none focus:border-[#F4B942] text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[#F6F3EA]/80 font-bold mb-1">
                Secret Password:
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#F6F3EA]/40 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#16302A] text-[#F6F3EA] rounded-xl border border-[#F6F3EA]/20 focus:outline-none focus:border-[#F4B942] text-sm font-sans"
                  required
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#F4B942] text-[#16302A] font-bold rounded-xl btn-chalk hover:bg-amber-400 text-sm shadow flex items-center justify-center gap-2 mt-3 disabled:opacity-50"
            >
              {isLoading ? (
                'Processing...'
              ) : mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" /> Sign In to Desk
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Claim Student Desk
                </>
              )}
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
