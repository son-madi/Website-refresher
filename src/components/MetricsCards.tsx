import React from 'react';
import { RefreshCw, CheckCircle2, Activity, Clock, Zap, AlertTriangle } from 'lucide-react';
import { SessionStats, PingResult, RunnerStatus } from '../types';
import { motion } from 'motion/react';

interface MetricsCardsProps {
  stats: SessionStats;
  uptimeSeconds: number;
  lastPing: PingResult | null;
  runnerStatus: RunnerStatus;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({
  stats,
  uptimeSeconds,
  lastPing,
  runnerStatus,
}) => {
  const isRunning = runnerStatus === 'running';

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

  const cardVariants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    hover: { y: -2, transition: { duration: 0.15 } },
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Total Refreshes */}
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs relative overflow-hidden"
      >
        <div className="flex items-center justify-between text-zinc-500 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total Refreshes</span>
          <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <RefreshCw className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold font-mono text-zinc-900 tracking-tight">
          {stats.totalRefreshes}
        </div>
        <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1.5 font-medium">
          <span className="text-emerald-600 font-semibold">{stats.successfulRefreshes} passed</span>
          {stats.failedRefreshes > 0 && (
            <span className="text-rose-500 font-semibold">({stats.failedRefreshes} failed)</span>
          )}
        </div>
      </motion.div>

      {/* 2. Last Status */}
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs relative overflow-hidden"
      >
        <div className="flex items-center justify-between text-zinc-500 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Last Status</span>
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center ${
              lastPing && !lastPing.ok
                ? 'bg-rose-50 text-rose-600'
                : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            {lastPing && !lastPing.ok ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold font-mono text-zinc-900 tracking-tight">
            {lastPing ? lastPing.status : '—'}
          </span>
          <span
            className={`text-xs font-semibold truncate ${
              lastPing && !lastPing.ok ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {lastPing ? lastPing.statusText : (isRunning ? 'Monitoring' : 'Standby')}
          </span>
        </div>
        <div className="text-[11px] text-zinc-500 mt-1 font-medium">
          Success rate: <strong className="text-zinc-800 font-bold">{successRate}%</strong>
        </div>
      </motion.div>

      {/* 3. Latency / Response Time */}
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs relative overflow-hidden"
      >
        <div className="flex items-center justify-between text-zinc-500 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Latency</span>
          <div className="w-7 h-7 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl sm:text-3xl font-extrabold font-mono text-zinc-900 tracking-tight">
            {lastPing && lastPing.latencyMs ? lastPing.latencyMs : (stats.averageLatencyMs || '—')}
          </span>
          <span className="text-xs text-zinc-500 font-mono font-medium">ms</span>
        </div>
        <div className="text-[11px] text-zinc-500 mt-1 font-medium">
          Avg latency: <strong className="text-zinc-800 font-mono font-bold">{stats.averageLatencyMs || 0}ms</strong>
        </div>
      </motion.div>

      {/* 4. Session Elapsed Uptime */}
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs relative overflow-hidden"
      >
        <div className="flex items-center justify-between text-zinc-500 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Session Timer</span>
          <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold font-mono text-zinc-900 tracking-tight">
          {formatTime(uptimeSeconds)}
        </div>
        <div className="text-[11px] text-zinc-500 mt-1 font-medium">
          State:{' '}
          <strong
            className={`font-semibold capitalize ${
              isRunning
                ? 'text-emerald-600'
                : runnerStatus === 'paused'
                ? 'text-amber-600'
                : 'text-zinc-500'
            }`}
          >
            {runnerStatus}
          </strong>
        </div>
      </motion.div>
    </div>
  );
};
