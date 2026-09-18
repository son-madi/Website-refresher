import React, { useState } from 'react';
import { ListFilter, Trash2, CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Copy, Check } from 'lucide-react';
import { RefreshLogEntry } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ActivityLogProps {
  logs: RefreshLogEntry[];
  onClearLogs: () => void;
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ logs, onClearLogs }) => {
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all');
  const [copied, setCopied] = useState<boolean>(false);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === 'success') return log.status === 'success';
    if (filter === 'error') return log.status === 'error' || log.status === 'warning';
    return true;
  });

  const copyLogsToClipboard = () => {
    const text = logs
      .map(
        (l) =>
          `[${formatTime(l.timestamp)}] Status: ${l.statusCode || l.status} | Latency: ${l.latencyMs || 0}ms | Interval: ${l.intervalUsed}s | URL: ${l.url}`
      )
      .join('\n');
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (entry: RefreshLogEntry) => {
    if (entry.status === 'success' || (entry.statusCode && entry.statusCode >= 200 && entry.statusCode < 300)) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>{entry.statusCode || 200} OK</span>
        </span>
      );
    }
    if (entry.statusCode && entry.statusCode >= 300 && entry.statusCode < 400) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/30">
          <span>{entry.statusCode} Redirect</span>
        </span>
      );
    }
    if (entry.status === 'warning') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          <span>{entry.statusCode || 'Notice'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30">
        <XCircle className="w-3 h-3 text-rose-400" />
        <span>{entry.statusCode || 500} Err</span>
      </span>
    );
  };

  return (
    <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 shadow-xl shadow-black/20 p-4 sm:p-5 flex flex-col h-full max-h-[500px] transition-all">
      {/* Header with Filters and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5 shrink-0">
        <div className="flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-zinc-100">Activity & Audit Log</h3>
          <span className="text-xs bg-zinc-800 text-zinc-300 font-mono font-semibold px-2 py-0.5 rounded-full border border-zinc-700/60">
            {logs.length}
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-2.5 py-0.5 rounded-md font-medium transition-colors ${
              filter === 'all' ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter('success')}
            className={`px-2.5 py-0.5 rounded-md font-medium transition-colors ${
              filter === 'success' ? 'bg-zinc-800 text-emerald-400 font-semibold shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Success
          </button>
          <button
            type="button"
            onClick={() => setFilter('error')}
            className={`px-2.5 py-0.5 rounded-md font-medium transition-colors ${
              filter === 'error' ? 'bg-zinc-800 text-rose-400 font-semibold shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Errors
          </button>
        </div>

        {/* Export / Clear buttons */}
        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <>
              <button
                type="button"
                onClick={copyLogsToClipboard}
                className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-zinc-800 border border-zinc-800"
                title="Copy log to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                id="clear-logs-btn"
                type="button"
                onClick={onClearLogs}
                className="text-xs text-zinc-500 hover:text-rose-400 transition-colors flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-zinc-800 border border-zinc-800"
                title="Clear all recorded entries"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Log Feed */}
      {filteredLogs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-500">
          <p className="text-xs">
            {logs.length === 0
              ? 'No refresh events recorded yet. Click Start to begin auto-refreshing.'
              : 'No log events match the selected filter.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
          <AnimatePresence initial={false}>
            {filteredLogs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="bg-zinc-950/70 hover:bg-zinc-950 border border-zinc-800/80 rounded-xl p-2.5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-zinc-500 shrink-0 text-[11px]">{formatTime(log.timestamp)}</span>
                  {getStatusBadge(log)}
                  <span className="text-zinc-200 truncate font-sans text-xs font-medium" title={log.url}>
                    {log.url}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 text-[11px] text-zinc-400 font-mono">
                  {log.latencyMs !== undefined && (
                    <span className="bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-750 text-zinc-200 font-bold">
                      {log.latencyMs}ms
                    </span>
                  )}
                  <span className="text-zinc-500">
                    wait: <strong className="text-zinc-300 font-bold">{log.intervalUsed}s</strong>
                  </span>
                  {log.cacheBusterApplied && (
                    <span className="text-indigo-400 flex items-center" title="Cache Buster enabled">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
