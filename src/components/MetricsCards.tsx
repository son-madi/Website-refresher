import React from 'react';
import { RefreshCw, CheckCircle2, Activity, Clock } from 'lucide-react';
import { SessionStats, PingResult } from '../types';

interface MetricsCardsProps {
  stats: SessionStats;
  uptimeSeconds: number;
  lastPing: PingResult | null;
  isRunning: boolean;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({
  stats,
  uptimeSeconds,
  lastPing,
  isRunning,
}) => {
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  const successRate = stats.totalRefreshes > 0
    ? Math.round((stats.successfulRefreshes / stats.totalRefreshes) * 100)
    : 100;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Total Refreshes */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
        <div className="flex items-center justify-between text-zinc-500 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">Total Refreshes</span>
          <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <RefreshCw className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-bold font-mono text-zinc-900">
          {stats.totalRefreshes}
        </div>
        <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
          <span className="text-emerald-600 font-medium">{stats.successfulRefreshes} passed</span>
          {stats.failedRefreshes > 0 && (
            <span className="text-rose-500 font-medium">({stats.failedRefreshes} issues)</span>
          )}
        </div>
      </div>

      {/* 2. HTTP Status */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
        <div className="flex items-center justify-between text-zinc-500 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">Last Status</span>
          <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold font-mono text-zinc-900">
            {lastPing ? lastPing.status : '—'}
          </span>
          <span className="text-xs font-medium text-emerald-600 truncate">
            {lastPing ? lastPing.statusText : (isRunning ? 'Ready' : 'Idle')}
          </span>
        </div>
        <div className="text-[11px] text-zinc-400 mt-1">
          Success Rate: <span className="text-zinc-700 font-medium">{successRate}%</span>
        </div>
      </div>

      {/* 3. Latency / Response Time */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
        <div className="flex items-center justify-between text-zinc-500 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">Latency</span>
          <div className="w-6 h-6 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl sm:text-3xl font-bold font-mono text-zinc-900">
            {lastPing && lastPing.latencyMs ? lastPing.latencyMs : (stats.averageLatencyMs || '—')}
          </span>
          <span className="text-xs text-zinc-500 font-mono font-medium">ms</span>
        </div>
        <div className="text-[11px] text-zinc-400 mt-1">
          Average: <span className="text-zinc-700 font-mono font-medium">{stats.averageLatencyMs || 0}ms</span>
        </div>
      </div>

      {/* 4. Active Session Uptime */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
        <div className="flex items-center justify-between text-zinc-500 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">Session Time</span>
          <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-bold font-mono text-zinc-900">
          {formatTime(uptimeSeconds)}
        </div>
        <div className="text-[11px] text-zinc-400 mt-1">
          Status: <span className={isRunning ? 'text-emerald-600 font-medium' : 'text-zinc-500'}>
            {isRunning ? 'Active auto-loop' : 'Paused'}
          </span>
        </div>
      </div>
    </div>
  );
};
