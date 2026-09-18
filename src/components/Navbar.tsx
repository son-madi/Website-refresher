import React from 'react';
import { RefreshCw, Volume2, VolumeX, Terminal, ShieldCheck, Play, Pause } from 'lucide-react';

interface NavbarProps {
  isRunning: boolean;
  onTogglePlay: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenRailwayModal: () => void;
  uptimeSeconds: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  isRunning,
  onTogglePlay,
  soundEnabled,
  onToggleSound,
  onOpenRailwayModal,
  uptimeSeconds,
}) => {
  const formatUptime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <header className="border-b border-zinc-200 bg-white/95 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo & Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
            <RefreshCw className={`w-5 h-5 ${isRunning ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-zinc-900 tracking-tight">Auto Refresher</h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                Railway Ready
              </span>
            </div>
            <p className="text-xs text-zinc-500 hidden md:block">Keep-alive pinger & configurable website reloader</p>
          </div>
        </div>

        {/* Center Live Status Indicator */}
        <div className="hidden sm:flex items-center gap-2 bg-zinc-50 border border-zinc-200/80 px-3 py-1.5 rounded-full text-xs text-zinc-600 font-medium">
          <span className="relative flex h-2.5 w-2.5">
            {isRunning ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
            )}
          </span>
          <span className="capitalize">{isRunning ? 'Actively Refreshing' : 'Paused / Idle'}</span>
          {isRunning && (
            <span className="text-zinc-400 ml-1 pl-2 border-l border-zinc-200 font-mono">
              {formatUptime(uptimeSeconds)}
            </span>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Play/Pause Header Button */}
          <button
            id="navbar-toggle-play-btn"
            onClick={onTogglePlay}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              isRunning
                ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-200'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span className="hidden xs:inline">{isRunning ? 'Pause' : 'Start'}</span>
          </button>

          {/* Sound Notification Toggle */}
          <button
            id="navbar-sound-toggle-btn"
            onClick={onToggleSound}
            title={soundEnabled ? 'Disable refresh chime sound' : 'Enable refresh chime sound'}
            className={`p-2 rounded-lg text-xs transition-colors border ${
              soundEnabled
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-white text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 border-zinc-200'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Railway Deployment Guide Modal Button */}
          <button
            id="navbar-railway-guide-btn"
            onClick={onOpenRailwayModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 transition-colors shadow-sm"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-300" />
            <span>Railway Deploy</span>
          </button>
        </div>
      </div>
    </header>
  );
};
