import React from 'react';
import { Play, Pause, RotateCcw, RefreshCw, Zap, ShieldCheck } from 'lucide-react';

interface ControlBarProps {
  isRunning: boolean;
  onTogglePlay: () => void;
  onInstantRefresh: () => void;
  onResetStats: () => void;
  remainingSeconds: number;
  totalIntervalSeconds: number;
  isRefreshingNow: boolean;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  isRunning,
  onTogglePlay,
  onInstantRefresh,
  onResetStats,
  remainingSeconds,
  totalIntervalSeconds,
  isRefreshingNow,
}) => {
  // Percentage calculated for smooth progress ring/bar
  const progressPercent = totalIntervalSeconds > 0
    ? Math.max(0, Math.min(100, ((totalIntervalSeconds - remainingSeconds) / totalIntervalSeconds) * 100))
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 sm:p-5">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Left: Big tactile Start / Pause Controller */}
        <div className="flex items-center gap-3">
          <button
            id="main-start-pause-btn"
            type="button"
            onClick={onTogglePlay}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-md active:scale-98 ${
              isRunning
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause Auto-Refresh</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Start Auto-Refresh</span>
              </>
            )}
          </button>

          <button
            id="action-refresh-now-btn"
            type="button"
            onClick={onInstantRefresh}
            disabled={isRefreshingNow}
            className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-medium text-sm bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-colors border border-zinc-200/80 disabled:opacity-50"
            title="Trigger an immediate refresh cycle right now"
          >
            <RefreshCw className={`w-4 h-4 text-zinc-600 ${isRefreshingNow ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh Now</span>
          </button>

          <button
            id="action-reset-stats-btn"
            type="button"
            onClick={onResetStats}
            className="p-3.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 border border-zinc-200/80 transition-colors"
            title="Reset refresh counters and session timer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Progress bar & remaining countdown */}
        <div className="flex-1 max-w-md bg-zinc-50 border border-zinc-200/80 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-zinc-500 font-medium flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300'}`} />
              {isRunning ? 'Next auto-refresh in:' : 'Timer paused:'}
            </span>
            <span className="font-mono font-bold text-zinc-900 text-sm">
              {isRunning ? `${Math.max(0, remainingSeconds).toFixed(1)}s` : 'Paused'}
            </span>
          </div>

          {/* Progress bar line */}
          <div className="w-full bg-zinc-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-200 rounded-full ${
                isRefreshingNow
                  ? 'bg-amber-400 animate-pulse'
                  : isRunning
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-600'
                  : 'bg-zinc-300'
              }`}
              style={{ width: `${isRunning ? progressPercent : 0}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
            <span>Cycle length: {totalIntervalSeconds}s</span>
            <span>{Math.round(progressPercent)}% elapsed</span>
          </div>
        </div>
      </div>
    </div>
  );
};
