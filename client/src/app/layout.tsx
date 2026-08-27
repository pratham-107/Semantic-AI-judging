import type { Metadata, Viewport } from 'next';
import { Kalam, Nunito, Space_Mono } from 'next/font/google';
import './globals.css';

const kalam = Kalam({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-kalam',
});

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
});

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'SketchAI — Semantic AI Drawing & Guessing Game',
  description:
    'Real-time multiplayer drawing & guessing game with AI semantic scoring, drawer accuracy calculation, and Fog of War reveal.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${kalam.variable} ${nunito.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full max-w-[100vw] overflow-x-hidden flex flex-col font-sans bg-[#1F3D33] text-[#F6F3EA] selection:bg-[#F4B942] selection:text-[#16302A]">
        {children}
      </body>
    </html>
  );
}
