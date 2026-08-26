'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Flame, CheckCircle2, Sparkles } from 'lucide-react';

interface DoodleStroke {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  color: string;
}

// Scripted coordinates for drawing a cute doodle dog / puppy
const DOODLE_STROKES: DoodleStroke[] = [
  // Head circle
  { prevX: 180, prevY: 140, x: 220, y: 120, color: '#F6F3EA' },
  { prevX: 220, prevY: 120, x: 260, y: 130, color: '#F6F3EA' },
  { prevX: 260, prevY: 130, x: 280, y: 170, color: '#F6F3EA' },
  { prevX: 280, prevY: 170, x: 270, y: 210, color: '#F6F3EA' },
  { prevX: 270, prevY: 210, x: 230, y: 230, color: '#F6F3EA' },
  { prevX: 230, prevY: 230, x: 190, y: 220, color: '#F6F3EA' },
  { prevX: 190, prevY: 220, x: 170, y: 180, color: '#F6F3EA' },
  { prevX: 170, prevY: 180, x: 180, y: 140, color: '#F6F3EA' },

  // Left Ear
  { prevX: 180, prevY: 140, x: 150, y: 110, color: '#F4B942' },
  { prevX: 150, prevY: 110, x: 140, y: 160, color: '#F4B942' },
  { prevX: 140, prevY: 160, x: 170, y: 170, color: '#F4B942' },

  // Right Ear
  { prevX: 260, prevY: 130, x: 290, y: 110, color: '#F4B942' },
  { prevX: 290, prevY: 110, x: 300, y: 160, color: '#F4B942' },
  { prevX: 300, prevY: 160, x: 270, y: 170, color: '#F4B942' },

  // Eyes & Nose
  { prevX: 200, prevY: 165, x: 202, y: 167, color: '#F6F3EA' },
  { prevX: 240, prevY: 165, x: 242, y: 167, color: '#F6F3EA' },
  { prevX: 220, prevY: 185, x: 225, y: 190, color: '#E1533B' },
  { prevX: 225, prevY: 190, x: 215, y: 190, color: '#E1533B' },

  // Body
  { prevX: 230, prevY: 230, x: 250, y: 280, color: '#F6F3EA' },
  { prevX: 250, prevY: 280, x: 330, y: 270, color: '#F6F3EA' },
  { prevX: 330, prevY: 270, x: 340, y: 230, color: '#F6F3EA' },
  { prevX: 340, prevY: 230, x: 270, y: 210, color: '#F6F3EA' },

  // Tail
  { prevX: 340, prevY: 230, x: 370, y: 200, color: '#F4B942' },
  { prevX: 370, prevY: 200, x: 380, y: 210, color: '#F4B942' },

  // Legs
  { prevX: 250, prevY: 280, x: 250, y: 320, color: '#F6F3EA' },
  { prevX: 270, prevY: 280, x: 270, y: 320, color: '#F6F3EA' },
  { prevX: 310, prevY: 275, x: 310, y: 320, color: '#F6F3EA' },
  { prevX: 330, prevY: 270, x: 330, y: 320, color: '#F6F3EA' },
];

const SCRIPTED_EVENTS = [
  { step: 5, guess: 'cat', warmth: 38, text: '❄️ Freezing' },
  { step: 14, guess: 'wolf', warmth: 68, text: '🌤️ Getting Warm' },
  { step: 20, guess: 'puppy', warmth: 84, text: '🔥 HOT! (+176 pts)' },
  { step: 28, guess: 'dog', warmth: 100, text: '🎯 BINGO! (+500 pts)' },
];

export function ChalkboardHeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [simulatedGuess, setSimulatedGuess] = useState({
    guess: '...',
    warmth: 0,
    text: 'Waiting for guess...',
  });

  useEffect(() => {
    let strokeIndex = 0;
    let timer: NodeJS.Timeout;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const interval = setInterval(() => {
      if (strokeIndex >= DOODLE_STROKES.length) {
        // Pause and reset loop
        clearInterval(interval);
        timer = setTimeout(() => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          setCurrentStep(0);
          setSimulatedGuess({ guess: '...', warmth: 0, text: 'Waiting for guess...' });
          strokeIndex = 0;
        }, 3000);
        return;
      }

      const stroke = DOODLE_STROKES[strokeIndex];
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(stroke.prevX, stroke.prevY);
      ctx.lineTo(stroke.x, stroke.y);
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = stroke.color;
      ctx.shadowBlur = 2;
      ctx.stroke();
      ctx.restore();

      const matchedEvent = SCRIPTED_EVENTS.find((e) => e.step === strokeIndex);
      if (matchedEvent) {
        setSimulatedGuess({
          guess: matchedEvent.guess,
          warmth: matchedEvent.warmth,
          text: matchedEvent.text,
        });
      }

      strokeIndex++;
      setCurrentStep(strokeIndex);
    }, 120);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [currentStep === 0]);

  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Chalkboard frame */}
      <div className="bg-[#1F3D33] chalkboard-frame p-2 relative rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1 bg-[#16302A]/80 border-b border-[#F6F3EA]/10 rounded-t-lg">
          <span className="text-xs font-mono font-bold text-[#F4B942] tracking-wider">
            LIVE DEMO CANVAS
          </span>
          <span className="text-xs font-mono text-[#F6F3EA]/60">
            Topic: Animals
          </span>
        </div>

        <canvas
          ref={canvasRef}
          width={450}
          height={360}
          className="w-full h-auto object-contain block bg-[#1F3D33]"
        />

        {/* Live warmth meter overlay */}
        <div className="absolute bottom-4 left-4 right-4 bg-[#16302A]/90 backdrop-blur-md border border-[#F6F3EA]/20 rounded-xl p-3 shadow-xl">
          <div className="flex items-center justify-between text-xs font-mono mb-1">
            <span className="text-[#F6F3EA]/80 font-bold">
              Guessed: <span className="text-[#F4B942] font-mono text-sm">&ldquo;{simulatedGuess.guess}&rdquo;</span>
            </span>
            <span className="text-amber-300 font-bold font-mono">
              {simulatedGuess.warmth}% Warmth
            </span>
          </div>

          <div className="w-full bg-black/60 h-3 rounded-full overflow-hidden border border-[#F6F3EA]/10 relative">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-amber-400 to-red-500 transition-all duration-300 rounded-full"
              style={{ width: `${Math.max(8, simulatedGuess.warmth)}%` }}
            />
          </div>

          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="text-[#F6F3EA]/90 font-medium">
              {simulatedGuess.text}
            </span>
            {simulatedGuess.warmth >= 80 && (
              <span className="text-xs font-mono font-bold text-green-400 animate-pulse">
                Semantic Match
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
