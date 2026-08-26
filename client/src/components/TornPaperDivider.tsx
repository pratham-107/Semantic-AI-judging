'use client';

import React from 'react';

interface TornPaperDividerProps {
  fillColor?: string; // color of the section below or above
  bgColor?: string;
  flip?: boolean;
}

export function TornPaperDivider({
  fillColor = '#FBF6E9',
  bgColor = '#1F3D33',
  flip = false,
}: TornPaperDividerProps) {
  return (
    <div
      className={`w-full overflow-hidden leading-none select-none ${flip ? 'rotate-180' : ''}`}
      style={{ backgroundColor: bgColor }}
    >
      <svg
        className="w-full block h-8 md:h-12"
        viewBox="0 0 1200 48"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0,0 
             C50,15 80,30 150,22 
             C220,14 260,35 340,25 
             C420,15 470,32 540,24 
             C610,16 660,36 740,26 
             C820,16 870,34 950,22 
             C1030,10 1080,30 1150,25 
             C1180,22 1195,15 1200,0 
             L1200,48 L0,48 Z"
          fill={fillColor}
        />
        {/* Notebook punch holes */}
        <circle cx="150" cy="35" r="4" fill={bgColor} opacity="0.4" />
        <circle cx="350" cy="35" r="4" fill={bgColor} opacity="0.4" />
        <circle cx="550" cy="35" r="4" fill={bgColor} opacity="0.4" />
        <circle cx="750" cy="35" r="4" fill={bgColor} opacity="0.4" />
        <circle cx="950" cy="35" r="4" fill={bgColor} opacity="0.4" />
        <circle cx="1150" cy="35" r="4" fill={bgColor} opacity="0.4" />
      </svg>
    </div>
  );
}
