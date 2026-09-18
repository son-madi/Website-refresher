import React from 'react';
import { RefreshCw, Volume2, VolumeX, Terminal, Play, Square, Pause } from 'lucide-react';
import { RunnerStatus } from '../types';
import { motion } from 'motion/react';

interface NavbarProps {
  runnerStatus: RunnerStatus;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenRailwayModal: () => void;
  uptimeSeconds: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  runnerStatus,
  onStart,
  onStop,
  onPause,
  soundEnabled,
  onToggleSound,
  onOpenRailwayModal,
  uptimeSeconds,
}) => {
  const isRunning = runnerStatus === 'running';
  const isPaused = runnerStatus === 'paused';

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusLabel = () => {
    switch (runnerStatus) {
      case 'running':
        return 'Running Auto-Refresh';
      case 'paused':
        return 'Paused';
      case 'stopped':
        return 'Stopped';
      default:
        return 'Ready / Idle';
    }
  };

  return (
    <header className="border-b border-zinc-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 10 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-200/60"
          >
            <RefreshCw
              className={`w-5 h-5 ${isRunning ? 'animate-spin' : ''}`}
              style={{ animationDuration: '3.5s' }}
            />
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-zinc-900 tracking-tight">Auto Refresher</h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                Railway Ready
              </span>
            </div>
            <p className="text-xs text-zinc-500 hidden md:block">Keep-alive pinger & configurable website reloader</p>
          </div>
        </div>

        {/* Center Dynamic Status Indicator */}
        <div className="hidden sm:flex items-center gap-2 bg-zinc-50 border border-zinc-200/80 px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-700 shadow-2xs">
          <span className="relative flex h-2.5 w-2.5">
            {isRunning && (
              <motion.span
                animate={{ scale: [1, 1.8, 1], opacity: [0.75, 0, 0.75] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
              />
            )}
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isRunning
                  ? 'bg-emerald-500'
                  : isPaused
                  ? 'bg-amber-400'
                  : runnerStatus === 'stopped'
                  ? 'bg-rose-500'
                  : 'bg-zinc-400'
              }`}
            />
          </span>
          <span className="font-semibold">{getStatusLabel()}</span>
          {(isRunning || isPaused) && (
            <span className="text-zinc-400 ml-1 pl-2 border-l border-zinc-200 font-mono text-[11px]">
              {formatUptime(uptimeSeconds)}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Quick Start / Stop / Pause Actions */}
          {!isRunning ? (
            <motion.button
              id="navbar-start-btn"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStart}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start</span>
            </motion.button>
          ) : (
            <>
              <motion.button
                id="navbar-pause-btn"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onPause}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors"
                title="Pause countdown"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span className="hidden xs:inline">Pause</span>
              </motion.button>

              <motion.button
                id="navbar-stop-btn"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onStop}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-200 transition-colors"
                title="Completely stop auto-refreshing"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </motion.button>
            </>
          )}

          {/* Sound Toggle */}
          <motion.button
            id="navbar-sound-toggle-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleSound}
            title={soundEnabled ? 'Disable refresh chime sound' : 'Enable refresh chime sound'}
            className={`p-2 rounded-lg text-xs transition-colors border ${
              soundEnabled
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs'
                : 'bg-white text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 border-zinc-200'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </motion.button>

          {/* Railway Deploy Modal */}
          <motion.button
            id="navbar-railway-guide-btn"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onOpenRailwayModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 transition-all shadow-sm"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-300" />
            <span className="hidden sm:inline">Railway Deploy</span>
            <span className="sm:hidden">Deploy</span>
          </motion.button>
        </div>
      </div>
    </header>
  );
};
