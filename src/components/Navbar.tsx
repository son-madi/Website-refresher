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
  remainingSeconds?: number;
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
  remainingSeconds,
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
        return 'Running';
      case 'paused':
        return 'Paused';
      case 'stopped':
        return 'Stopped';
      default:
        return 'Ready';
    }
  };

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md sticky top-0 z-30 transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 10 }}
            whileTap={{ scale: 0.95 }}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-950/60 shrink-0"
          >
            <RefreshCw
              className={`w-4 h-4 sm:w-5 sm:h-5 ${isRunning ? 'animate-spin' : ''}`}
              style={{ animationDuration: '3.5s' }}
            />
          </motion.div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-base font-bold text-zinc-100 tracking-tight truncate">
                <span className="hidden xs:inline">Auto </span>Refresher
              </h1>
              <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Railway Ready
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden md:block truncate">Keep-alive pinger & configurable reloader</p>
          </div>
        </div>

        {/* Center Dynamic Status Indicator (Desktop) */}
        <div className="hidden md:flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 px-3 py-1 rounded-full text-xs font-medium text-zinc-300 shadow-2xs">
          <span className="relative flex h-2 w-2">
            {isRunning && (
              <motion.span
                animate={{ scale: [1, 2, 1], opacity: [0.8, 0, 0.8] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
              />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isRunning
                  ? 'bg-emerald-500'
                  : isPaused
                  ? 'bg-amber-400'
                  : runnerStatus === 'stopped'
                  ? 'bg-rose-500'
                  : 'bg-zinc-500'
              }`}
            />
          </span>
          <span className="font-semibold text-zinc-200">{getStatusLabel()}</span>
          {isRunning && remainingSeconds !== undefined && (
            <span className="text-indigo-400 font-mono text-[11px] font-semibold">
              ({remainingSeconds.toFixed(1)}s)
            </span>
          )}
          {(isRunning || isPaused) && (
            <span className="text-zinc-500 ml-1 pl-2 border-l border-zinc-800 font-mono text-[11px]">
              {formatUptime(uptimeSeconds)}
            </span>
          )}
        </div>

        {/* Action Controls - Scaled & Touch friendly on mobile */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Quick Start / Stop / Pause Actions */}
          {!isRunning ? (
            <motion.button
              id="navbar-start-btn"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStart}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-950/50 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start</span>
            </motion.button>
          ) : (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <motion.button
                id="navbar-pause-btn"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onPause}
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition-colors"
                title="Pause countdown"
              >
                <Pause className="w-3 h-3 fill-current" />
                <span className="hidden sm:inline">Pause</span>
              </motion.button>

              <motion.button
                id="navbar-stop-btn"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onStop}
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500 shadow-sm shadow-rose-950/50 transition-colors"
                title="Stop auto-refreshing"
              >
                <Square className="w-3 h-3 fill-current" />
                <span className="hidden sm:inline">Stop</span>
              </motion.button>
            </div>
          )}

          {/* Sound Toggle */}
          <motion.button
            id="navbar-sound-toggle-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute sound notification' : 'Enable sound notification'}
            className={`p-1.5 sm:p-2 rounded-lg text-xs transition-colors border ${
              soundEnabled
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-xs'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border-zinc-800'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </motion.button>

          {/* Railway Deploy Modal */}
          <motion.button
            id="navbar-railway-guide-btn"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onOpenRailwayModal}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 transition-all shadow-xs"
            title="Railway web url configuration and troubleshooting guide"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Railway</span>
            <span className="sm:hidden">Deploy</span>
          </motion.button>
        </div>
      </div>
    </header>
  );
};
