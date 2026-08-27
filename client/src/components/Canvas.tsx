'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSocketGame } from '../context/SocketContext';
import { StrokeData } from '../types/game.types';
import { Trash2, Paintbrush } from 'lucide-react';

interface CanvasProps {
  isDrawer: boolean;
  disabled?: boolean;
}

const CHALK_COLORS = [
  { name: 'Chalk White', hex: '#F6F3EA' },
  { name: 'Marker Yellow', hex: '#F4B942' },
  { name: 'Crayon Red', hex: '#E1533B' },
  { name: 'Ruler Blue', hex: '#3E6FD9' },
  { name: 'Eraser Pink', hex: '#E9A0B0' },
  { name: 'Blackboard Eraser', hex: '#1F3D33' },
];

const BRUSH_SIZES = [
  { size: 4, label: 'Thin' },
  { size: 8, label: 'Med' },
  { size: 16, label: 'Thick' },
];

export function Canvas({ isDrawer, disabled = false }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const prevPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastEmitTimeRef = useRef(0);

  const [selectedColor, setSelectedColor] = useState<string>('#F6F3EA');
  const [selectedWidth, setSelectedWidth] = useState<number>(6);

  const { socket, sendStroke, clearStroke } = useSocketGame();

  const VIRTUAL_WIDTH = 800;
  const VIRTUAL_HEIGHT = 600;

  // Draw a stroke segment on the local HTML5 Canvas
  const drawSegment = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      prevX: number,
      prevY: number,
      color: string,
      width: number
    ) => {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Chalk-like rough shadow effect
      if (color !== '#1F3D33') {
        ctx.shadowColor = color;
        ctx.shadowBlur = 1.5;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.stroke();
      ctx.restore();
    },
    []
  );

  // Clear local canvas
  const handleClearLocal = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const handleClearClick = () => {
    if (!isDrawer || disabled) return;
    handleClearLocal();
    clearStroke();
  };

  // Convert client mouse/touch event coordinates to normalized 800x600 virtual canvas coordinates
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    const scaleX = VIRTUAL_WIDTH / rect.width;
    const scaleY = VIRTUAL_HEIGHT / rect.height;

    const x = Math.max(0, Math.min(VIRTUAL_WIDTH, Math.round((clientX - rect.left) * scaleX)));
    const y = Math.max(0, Math.min(VIRTUAL_HEIGHT, Math.round((clientY - rect.top) * scaleY)));

    return { x, y };
  };

  // Listen to incoming stroke broadcasts from game server
  useEffect(() => {
    if (!socket) return;

    const handleStrokeBroadcast = (stroke: StrokeData) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      drawSegment(
        ctx,
        stroke.x,
        stroke.y,
        stroke.prevX,
        stroke.prevY,
        stroke.color,
        stroke.width
      );
    };

    const handleRemoteClear = () => {
      handleClearLocal();
    };

    socket.on('stroke:broadcast', handleStrokeBroadcast);
    socket.on('stroke:clear', handleRemoteClear);

    return () => {
      socket.off('stroke:broadcast', handleStrokeBroadcast);
      socket.off('stroke:clear', handleRemoteClear);
    };
  }, [socket, drawSegment, handleClearLocal]);

  // Drawing event handlers for Drawer
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer || disabled) return;
    if ('button' in e && (e as React.MouseEvent).button !== 0) return;

    isDrawingRef.current = true;
    const point = getCoordinates(e);
    prevPointRef.current = point;

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawSegment(ctx, point.x, point.y, point.x + 0.1, point.y + 0.1, selectedColor, selectedWidth);
      }
    }

    sendStroke({
      x: point.x,
      y: point.y,
      prevX: point.x + 0.1,
      prevY: point.y + 0.1,
      color: selectedColor,
      width: selectedWidth,
      isNewStroke: true,
    });
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || !isDrawer || disabled) return;

    const now = performance.now();
    const point = getCoordinates(e);
    const prev = prevPointRef.current || point;

    const dist = Math.hypot(point.x - prev.x, point.y - prev.y);
    if (dist < 1.5) return;

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawSegment(ctx, point.x, point.y, prev.x, prev.y, selectedColor, selectedWidth);
      }
    }

    // Throttle socket emission to ~60fps (every 16ms)
    if (now - lastEmitTimeRef.current >= 16) {
      sendStroke({
        x: point.x,
        y: point.y,
        prevX: prev.x,
        prevY: prev.y,
        color: selectedColor,
        width: selectedWidth,
      });
      lastEmitTimeRef.current = now;
    }

    prevPointRef.current = point;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    prevPointRef.current = null;
  };

  return (
    <div className="flex flex-col w-full h-full gap-2" ref={containerRef}>
      {/* Canvas Viewport Frame */}
      <div className="relative w-full aspect-[4/3] bg-[#1F3D33] chalkboard-frame overflow-hidden select-none touch-none rounded-xl">
        <canvas
          ref={canvasRef}
          width={VIRTUAL_WIDTH}
          height={VIRTUAL_HEIGHT}
          className="w-full h-full object-contain cursor-crosshair touch-none"
          style={{ touchAction: 'none' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
        />

        {/* Chalk dust subtle texture overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#F6F3EA_1px,transparent_1px)] [background-size:16px_16px]" />

        {!isDrawer && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-[10px] sm:text-xs font-mono text-[#F6F3EA] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-[#F6F3EA]/20 flex items-center gap-1.5 shadow">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-400 animate-ping" />
            Fog of War Active
          </div>
        )}
      </div>

      {/* Drawer Toolbar */}
      {isDrawer && !disabled && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#16302A] p-2 sm:p-2.5 rounded-xl border border-[#F6F3EA]/20 shadow-md">
          {/* Color palette */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {CHALK_COLORS.map((c) => (
              <button
                key={c.name}
                type="button"
                title={c.name}
                onClick={() => setSelectedColor(c.hex)}
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 transition-transform ${
                  selectedColor === c.hex
                    ? 'scale-125 border-white shadow-lg ring-2 ring-[#F4B942]'
                    : 'border-black/40 hover:scale-110'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>

          {/* Stroke Width Selector & Clear button */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1">
              {BRUSH_SIZES.map((b) => (
                <button
                  key={b.size}
                  type="button"
                  title={b.label}
                  onClick={() => setSelectedWidth(b.size)}
                  className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-mono rounded border transition-all ${
                    selectedWidth === b.size
                      ? 'bg-[#F4B942] text-[#16302A] font-bold border-[#F4B942]'
                      : 'bg-black/30 text-[#F6F3EA] border-[#F6F3EA]/20 hover:bg-black/50'
                  }`}
                >
                  {b.size}px
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleClearClick}
              className="flex items-center gap-1 px-2.5 py-1 text-[10px] sm:text-xs font-mono font-bold bg-[#E1533B] text-[#F6F3EA] rounded-lg hover:bg-red-600 transition-colors shadow shrink-0"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
