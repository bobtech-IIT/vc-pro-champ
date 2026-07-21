'use client';

import React, { useEffect, useState } from 'react';
import { Droplets, Clock, Sparkles } from 'lucide-react';

interface WaterBreakModalProps {
  isOpen: boolean;
  onTimerComplete: () => void;
}

export default function WaterBreakModal({ isOpen, onTimerComplete }: WaterBreakModalProps) {
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(60);
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimerComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, onTimerComplete]);

  if (!isOpen) return null;

  const progressPercentage = ((60 - timeLeft) / 60) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl shadow-indigo-500/20 text-center relative overflow-hidden">
        
        {/* Glowing background circle */}
        <div className="absolute -top-12 -left-12 w-36 h-36 bg-cyan-500/20 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-indigo-500/20 rounded-full blur-2xl"></div>

        {/* Animated Water Icon */}
        <div className="relative mx-auto w-20 h-20 mb-5 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 animate-bounce">
          <Droplets className="w-10 h-10 text-white" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
          Please drink some water 💧
        </h2>

        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
          You are scanning heavily! Taking a mandatory 1-minute break after 50 card uploads to ensure 100% data extraction precision and system cooldown.
        </p>

        {/* Countdown Ring / Progress */}
        <div className="relative mb-6">
          <div className="flex items-center justify-center gap-2 text-3xl font-mono font-bold text-cyan-400">
            <Clock className="w-6 h-6 animate-pulse" />
            <span>00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
          </div>

          <div className="w-full bg-slate-800 h-2.5 rounded-full mt-4 overflow-hidden border border-slate-700">
            <div
              className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 bg-slate-950/60 py-2.5 px-4 rounded-xl border border-slate-800">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Processing automatically resumes when timer completes.</span>
        </div>
      </div>
    </div>
  );
}
