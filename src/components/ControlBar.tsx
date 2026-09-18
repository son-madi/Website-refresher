import React from 'react';
import { Play, Square, Pause, RotateCcw, RefreshCw, Sparkles, Activity, Clock } from 'lucide-react';
import { RunnerStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ControlBarProps {
  runnerStatus: RunnerStatus;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onInstantRefresh: () => void;
  onResetStats: () => void;
  remainingSeconds: number;
  totalIntervalSeconds: number;
  isRefreshingNow: boolean;
  currentCycleCount: number;
  maxCycles: number;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  runnerStatus,
  onStart,
  onStop,
  onPause,
  onResume,
  onInstantRefresh,
  onResetStats,
  remainingSeconds,
  totalIntervalSeconds,
  isRefreshingNow,
  currentCycleCount,
  maxCycles,
}) => {
  const isRunning = runnerStatus === 'running';
  const isPaused = runnerStatus === 'paused';
  const isStopped = runnerStatus === 'stopped' || runnerStatus === 'idle';

  // Percentage for progress calculation
  const progressPercent = totalIntervalSeconds > 0
    ? Math.max(0, Math.min(100, ((totalIntervalSeconds - remainingSeconds) / totalIntervalSeconds) * 100))
    : 0;

  return (
    <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 shadow-xl shadow-black/20 p-4 sm:p-5 relative overflow-hidden transition-all">
      {/* Background soft ambient glow when running */}
      {isRunning && (
        <motion.div
          animate={{ opacity: [0.05, 0.12, 0.05] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-indigo-500/20 to-violet-500/20 pointer-events-none"
        />
      )}

      <div className="relative z-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 sm:gap-5">
        {/* Primary Tactile Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Main START Button */}
          {isStopped && (
            <motion.button
              id="main-start-btn"
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStart}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/60 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Auto-Refresh</span>
            </motion.button>
          )}

          {/* PAUSE / RESUME Button */}
          {isRunning && (
            <motion.button
              id="main-pause-btn"
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onPause}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-sm transition-all"
              title="Pause countdown without losing current progress"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause</span>
            </motion.button>
          )}

          {isPaused && (
            <motion.button
              id="main-resume-btn"
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onResume}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/60 transition-all"
              title="Resume auto-refresh countdown"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Resume</span>
            </motion.button>
          )}

          {/* STOP Button (Always available while running or paused) */}
          {(isRunning || isPaused) && (
            <motion.button
              id="main-stop-btn"
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStop}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950/60 transition-all"
              title="Stop auto-refreshing completely and reset countdown"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Stop</span>
            </motion.button>
          )}

          {/* Instant Force Refresh Button */}
          <motion.button
            id="action-instant-refresh-btn"
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onInstantRefresh}
            disabled={isRefreshingNow}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm bg-zinc-800 hover:bg-zinc-750 text-zinc-200 hover:text-white transition-colors border border-zinc-750 disabled:opacity-50"
            title="Execute immediate refresh right now"
          >
            <RefreshCw className={`w-4 h-4 text-indigo-400 ${isRefreshingNow ? 'animate-spin' : ''}`} />
            <span>Refresh Now</span>
          </motion.button>

          {/* Reset Session Counters Button */}
          <motion.button
            id="action-reset-counters-btn"
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onResetStats}
            className="p-3 rounded-xl text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 transition-colors shrink-0"
            title="Reset refresh counters and session statistics"
          >
            <RotateCcw className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Live Countdown & Progress Visualization */}
        <div className="flex-1 lg:max-w-md bg-zinc-950/70 border border-zinc-800 rounded-xl p-3 sm:p-3.5 flex flex-col justify-center">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                {isRunning && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isRunning
                      ? 'bg-emerald-500'
                      : isPaused
                      ? 'bg-amber-400'
                      : 'bg-zinc-600'
                  }`}
                />
              </span>
              <span className="font-semibold text-zinc-300">
                {isRunning
                  ? 'Next refresh in:'
                  : isPaused
                  ? 'Timer paused at:'
                  : runnerStatus === 'stopped'
                  ? 'Auto-refresh stopped'
                  : 'Ready to start'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-base font-bold text-zinc-100">
                {isRunning || isPaused
                  ? `${Math.max(0, remainingSeconds).toFixed(1)}s`
                  : `${totalIntervalSeconds}s`}
              </span>
            </div>
          </div>

          {/* Smooth Animated Progress Bar */}
          <div className="w-full bg-zinc-800/90 rounded-full h-2.5 overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-all ${
                isRefreshingNow
                  ? 'bg-amber-400 animate-pulse'
                  : isRunning
                  ? 'bg-gradient-to-r from-emerald-500 via-indigo-500 to-violet-500'
                  : isPaused
                  ? 'bg-amber-400'
                  : 'bg-zinc-700'
              }`}
              style={{
                width: `${isRunning || isPaused ? progressPercent : 0}%`,
              }}
            />
          </div>

          {/* Cycle & Status Details */}
          <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1.5 font-mono">
            <span>Cycle length: {totalIntervalSeconds}s</span>
            <span>
              {maxCycles > 0 ? (
                <span>
                  Refreshes: <strong className="text-zinc-300">{currentCycleCount}</strong> / {maxCycles}
                </span>
              ) : (
                <span>
                  Cycles: <strong className="text-zinc-300">{currentCycleCount}</strong> (unlimited)
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
