import React from 'react';
import { ListFilter, Trash2, CheckCircle2, AlertTriangle, XCircle, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { RefreshLogEntry } from '../types';

interface ActivityLogProps {
  logs: RefreshLogEntry[];
  onClearLogs: () => void;
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ logs, onClearLogs }) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getStatusBadge = (entry: RefreshLogEntry) => {
    if (entry.status === 'success' || (entry.statusCode && entry.statusCode >= 200 && entry.statusCode < 300)) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>{entry.statusCode || 200} OK</span>
        </span>
      );
    }
    if (entry.statusCode && entry.statusCode >= 300 && entry.statusCode < 400) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <span>{entry.statusCode} Redirect</span>
        </span>
      );
    }
    if (entry.status === 'warning') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          <span>{entry.statusCode || 'Notice'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <XCircle className="w-3 h-3 text-rose-600" />
        <span>{entry.statusCode || 500} Err</span>
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 sm:p-5 flex flex-col h-full max-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-zinc-900">Live Refresh Logs</h3>
          <span className="text-xs bg-zinc-100 text-zinc-600 font-mono px-2 py-0.5 rounded-full">
            {logs.length}
          </span>
        </div>

        {logs.length > 0 && (
          <button
            id="clear-logs-btn"
            type="button"
            onClick={onClearLogs}
            className="text-xs text-zinc-400 hover:text-rose-600 transition-colors flex items-center gap-1"
            title="Clear all logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Log Feed */}
      {logs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-400">
          <p className="text-xs">No refresh logs yet. Start auto-refreshing to view real-time request audits.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-zinc-50 hover:bg-zinc-100/80 border border-zinc-200/70 rounded-xl p-2.5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-zinc-400 shrink-0 text-[11px]">{formatTime(log.timestamp)}</span>
                {getStatusBadge(log)}
                <span className="text-zinc-700 truncate font-sans text-xs" title={log.url}>
                  {log.url}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0 text-[11px] text-zinc-500">
                {log.latencyMs !== undefined && (
                  <span className="bg-white px-2 py-0.5 rounded border border-zinc-200 text-zinc-700 font-medium">
                    {log.latencyMs}ms
                  </span>
                )}
                <span className="text-zinc-400">
                  interval: <strong className="text-zinc-600">{log.intervalUsed}s</strong>
                </span>
                {log.cacheBusterApplied && (
                  <span className="text-indigo-600 flex items-center" title="Cache Buster applied">
                    <ShieldCheck className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
