/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { UrlInputBar } from './components/UrlInputBar';
import { IntervalConfig } from './components/IntervalConfig';
import { ControlBar } from './components/ControlBar';
import { MetricsCards } from './components/MetricsCards';
import { LiveFrame } from './components/LiveFrame';
import { ActivityLog } from './components/ActivityLog';
import { RailwayDeployModal } from './components/RailwayDeployModal';
import { RefreshConfig, RefreshLogEntry, SessionStats, PingResult, RunnerStatus } from './types';
import { playRefreshChime } from './utils/audio';
import { LayoutGrid, Eye, Terminal, Play, Square, Pause, RotateCcw, Cloud, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const LOCAL_STORAGE_RECENT_URLS = 'auto_refresher_recent_urls';
const LOCAL_STORAGE_SAVED_CONFIG = 'auto_refresher_config';

export default function App() {
  // Config state
  const [config, setConfig] = useState<RefreshConfig>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SAVED_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          maxCycles: parsed.maxCycles ?? 0,
        };
      }
    } catch {
      // Ignore parse error
    }
    return {
      url: 'https://example.com',
      intervalType: 'random', // Default to 10-45s random range as requested
      fixedSeconds: 15,
      randomMinSeconds: 10,
      randomMaxSeconds: 45,
      useCacheBuster: true,
      soundNotification: false,
      refreshMode: 'dual',
      autoStartOnUrlChange: false,
      maxCycles: 0, // 0 = continuous
    };
  });

  // Runner state: 'idle' | 'running' | 'paused' | 'stopped'
  const [runnerStatus, setRunnerStatus] = useState<RunnerStatus>('idle');
  const [cycleCount, setCycleCount] = useState<number>(0);

  const [currentIntervalDuration, setCurrentIntervalDuration] = useState<number>(30);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(30);
  const [refreshKey, setRefreshKey] = useState<number>(1);
  const [isRefreshingNow, setIsRefreshingNow] = useState<boolean>(false);
  const [uptimeSeconds, setUptimeSeconds] = useState<number>(0);
  const [activeView, setActiveView] = useState<'split' | 'preview' | 'logs'>('split');
  const [isRailwayModalOpen, setIsRailwayModalOpen] = useState<boolean>(false);

  // Robust refs to prevent glitching, multiple trigger races, and state tearing
  const nextRefreshTimestampRef = useRef<number>(0);
  const isRefreshingRef = useRef<boolean>(false);
  const pausedRemainingSecondsRef = useRef<number>(0);
  const configRef = useRef(config);
  configRef.current = config;
  const currentIntervalDurationRef = useRef<number>(currentIntervalDuration);
  currentIntervalDurationRef.current = currentIntervalDuration;

  const [recentUrls, setRecentUrls] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_RECENT_URLS);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return ['https://example.com', 'https://httpbin.org/get', 'https://1.1.1.1/cdn-cgi/trace'];
  });

  const [lastPing, setLastPing] = useState<PingResult | null>(null);
  const [logs, setLogs] = useState<RefreshLogEntry[]>([]);
  const [stats, setStats] = useState<SessionStats>({
    totalRefreshes: 0,
    successfulRefreshes: 0,
    failedRefreshes: 0,
    averageLatencyMs: 0,
    startedAt: null,
    lastRefreshedAt: null,
  });

  const isRunning = runnerStatus === 'running';
  const runnerStatusRef = useRef<RunnerStatus>(runnerStatus);
  runnerStatusRef.current = runnerStatus;

  // Calculate next cycle duration based on current config
  const calculateNextInterval = useCallback((): number => {
    const currentCfg = configRef.current;
    if (currentCfg.intervalType === 'random') {
      const min = Math.max(1, Math.min(currentCfg.randomMinSeconds, currentCfg.randomMaxSeconds));
      const max = Math.max(min, Math.max(currentCfg.randomMinSeconds, currentCfg.randomMaxSeconds));
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    return Math.max(1, currentCfg.fixedSeconds);
  }, []);

  // Sync state from server 24/7 background runner
  const syncRunnerStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/runner/status');
      if (!res.ok) return;
      const data = await res.json();

      if (data.runnerStatus === 'running' || data.runnerStatus === 'paused') {
        setRunnerStatus(data.runnerStatus);
        if (data.targetUrl && data.targetUrl !== configRef.current.url) {
          setConfig((prev) => ({ ...prev, url: data.targetUrl }));
        }
        if (typeof data.uptimeSeconds === 'number') {
          setUptimeSeconds(data.uptimeSeconds);
        }
        if (data.nextRefreshTimestamp) {
          nextRefreshTimestampRef.current = data.nextRefreshTimestamp;
          const remaining = Math.max(0, (data.nextRefreshTimestamp - Date.now()) / 1000);
          setRemainingSeconds(parseFloat(remaining.toFixed(1)));
        }
        if (data.stats) {
          setStats((prev) => {
            // If new refreshes completed while user was away, reload iframe preview
            if (data.stats.totalRefreshes > prev.totalRefreshes) {
              setRefreshKey((k) => k + 1);
            }
            return {
              totalRefreshes: data.stats.totalRefreshes,
              successfulRefreshes: data.stats.successfulRefreshes,
              failedRefreshes: data.stats.failedRefreshes,
              averageLatencyMs: data.stats.averageLatencyMs,
              startedAt: data.startedAt ? new Date(data.startedAt) : prev.startedAt,
              lastRefreshedAt: data.lastPing?.timestamp ? new Date(data.lastPing.timestamp) : prev.lastRefreshedAt,
            };
          });
          setCycleCount(data.stats.totalRefreshes);
        }
        if (data.lastPing) {
          setLastPing(data.lastPing);
        }
        if (Array.isArray(data.logs) && data.logs.length > 0) {
          setLogs(
            data.logs.map((item: any) => ({
              id: item.id,
              timestamp: new Date(item.timestamp),
              url: item.url,
              intervalUsed: item.intervalUsed,
              status: item.status,
              statusCode: item.statusCode,
              latencyMs: item.latencyMs,
              message: item.message,
              cacheBusterApplied: item.cacheBusterApplied,
            }))
          );
        }
      } else if (data.runnerStatus === 'idle' && runnerStatusRef.current === 'running') {
        setRunnerStatus('stopped');
      }
    } catch (err) {
      console.error('Failed to sync runner status with server:', err);
    }
  }, []);

  // Initial mount: load active background runner state from server
  useEffect(() => {
    syncRunnerStatus();
  }, [syncRunnerStatus]);

  // When user returns to tab (even after 10+ minutes or reopening browser), immediately re-sync
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncRunnerStatus();
      }
    };

    const handleFocus = () => {
      syncRunnerStatus();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Light background heartbeat poll every 2.5 seconds to sync stats & logs from server
    const pollTimer = setInterval(() => {
      syncRunnerStatus();
    }, 2500);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(pollTimer);
    };
  }, [syncRunnerStatus]);

  // Persist config changes
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_SAVED_CONFIG, JSON.stringify(config));
    } catch {
      // Ignore
    }
  }, [config]);

  // Execute single refresh event without race conditions
  const triggerRefreshCycle = useCallback(async (manual = false) => {
    const currentCfg = configRef.current;
    if (!currentCfg.url) return;
    if (isRefreshingRef.current && !manual) return;

    isRefreshingRef.current = true;
    setIsRefreshingNow(true);

    if (currentCfg.soundNotification) {
      playRefreshChime();
    }

    // Always increment key to reload iframe if in dual or iframe mode
    if (currentCfg.refreshMode === 'dual' || currentCfg.refreshMode === 'iframe') {
      setRefreshKey((prev) => prev + 1);
    }

    let pingOutcome: PingResult | null = null;
    const intervalUsed = currentIntervalDurationRef.current;
    const targetUrl = currentCfg.url;

    // Trigger HTTP ping check if in dual or ping mode
    if (currentCfg.refreshMode === 'dual' || currentCfg.refreshMode === 'ping') {
      try {
        const res = await fetch(`/api/ping?url=${encodeURIComponent(targetUrl)}`);
        if (res.ok) {
          pingOutcome = await res.json();
          setLastPing(pingOutcome);
        }
      } catch (err: unknown) {
        const error = err as Error;
        pingOutcome = {
          ok: false,
          status: 500,
          statusText: error.message || 'Fetch Failed',
          latencyMs: 0,
          contentType: 'none',
          blocksIframe: false,
          url: targetUrl,
          timestamp: new Date().toISOString(),
          error: error.message,
        };
        setLastPing(pingOutcome);
      }
    }

    const isSuccess = pingOutcome ? pingOutcome.ok : true;
    const latency = pingOutcome?.latencyMs;

    // Update cycle count
    setCycleCount((prevCount) => {
      const newCount = prevCount + 1;

      // Check max cycles auto-stop
      if (currentCfg.maxCycles > 0 && newCount >= currentCfg.maxCycles) {
        setTimeout(() => {
          handleStop();
          setLogs((l) => [
            {
              id: `${Date.now()}-limit`,
              timestamp: new Date(),
              url: targetUrl,
              intervalUsed,
              status: 'warning',
              statusCode: 200,
              message: `Completed target limit of ${currentCfg.maxCycles} refreshes. Auto-stopped.`,
              cacheBusterApplied: false,
            },
            ...l,
          ]);
        }, 50);
      }

      return newCount;
    });

    // Update session metrics
    setStats((prev) => {
      const total = prev.totalRefreshes + 1;
      const success = isSuccess ? prev.successfulRefreshes + 1 : prev.successfulRefreshes;
      const failed = isSuccess ? prev.failedRefreshes : prev.failedRefreshes + 1;
      const newAvgLatency = latency
        ? Math.round((prev.averageLatencyMs * prev.totalRefreshes + latency) / total)
        : prev.averageLatencyMs;

      return {
        ...prev,
        totalRefreshes: total,
        successfulRefreshes: success,
        failedRefreshes: failed,
        averageLatencyMs: newAvgLatency,
        lastRefreshedAt: new Date(),
      };
    });

    // Append to live logs
    const newLogEntry: RefreshLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date(),
      url: targetUrl,
      intervalUsed,
      status: isSuccess ? 'success' : 'error',
      statusCode: pingOutcome?.status || 200,
      latencyMs: latency,
      message: pingOutcome?.statusText || 'Refreshed successfully',
      cacheBusterApplied: currentCfg.useCacheBuster,
    };

    setLogs((prev) => [newLogEntry, ...prev.slice(0, 99)]);

    // Prepare next cycle
    const nextDuration = calculateNextInterval();
    setCurrentIntervalDuration(nextDuration);
    setRemainingSeconds(nextDuration);
    nextRefreshTimestampRef.current = Date.now() + nextDuration * 1000;

    setTimeout(() => {
      setIsRefreshingNow(false);
      isRefreshingRef.current = false;
    }, 400);
  }, [calculateNextInterval]);

  // Main countdown timer loop: monotonic timestamp based, completely glitch-free
  useEffect(() => {
    if (runnerStatus !== 'running') return;

    const intervalTimer = setInterval(() => {
      const target = nextRefreshTimestampRef.current;
      if (target <= 0) return;

      const now = Date.now();
      const remainingMs = target - now;

      if (remainingMs <= 0) {
        if (!isRefreshingRef.current) {
          triggerRefreshCycle(false);
        }
      } else {
        const remainingSec = Math.max(0, parseFloat((remainingMs / 1000).toFixed(1)));
        setRemainingSeconds(remainingSec);
      }
    }, 100);

    return () => clearInterval(intervalTimer);
  }, [runnerStatus, triggerRefreshCycle]);

  // Session Uptime clock
  useEffect(() => {
    if (runnerStatus !== 'running') return;

    const uptimeTimer = setInterval(() => {
      setUptimeSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(uptimeTimer);
  }, [runnerStatus]);

  // Explicit START Function: Starts both server 24/7 runner and client UI loop
  const handleStart = async () => {
    if (!stats.startedAt) {
      setStats((prev) => ({ ...prev, startedAt: new Date() }));
    }
    const nextDuration = calculateNextInterval();
    setCurrentIntervalDuration(nextDuration);
    setRemainingSeconds(nextDuration);
    nextRefreshTimestampRef.current = Date.now() + nextDuration * 1000;
    isRefreshingRef.current = false;
    pausedRemainingSecondsRef.current = 0;
    setRunnerStatus('running');

    // Notify backend server to execute 24/7 background refresh loop
    try {
      await fetch('/api/runner/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: config.url,
          intervalType: config.intervalType,
          fixedSeconds: config.fixedSeconds,
          randomMinSeconds: config.randomMinSeconds,
          randomMaxSeconds: config.randomMaxSeconds,
          refreshMode: config.refreshMode,
          useCacheBuster: config.useCacheBuster,
        }),
      });
    } catch (err) {
      console.error('Failed to notify backend runner start:', err);
    }

    // Add log event
    setLogs((prev) => [
      {
        id: `${Date.now()}-start`,
        timestamp: new Date(),
        url: config.url,
        intervalUsed: nextDuration,
        status: 'success',
        statusCode: 200,
        message: `Auto-refresh started. Continuous 24/7 server keep-alive active (${nextDuration}s cycle).`,
        cacheBusterApplied: config.useCacheBuster,
      },
      ...prev.slice(0, 99),
    ]);

    // Fire initial refresh right away
    triggerRefreshCycle(true);
  };

  // Explicit STOP Function
  const handleStop = async () => {
    setRunnerStatus('stopped');
    nextRefreshTimestampRef.current = 0;
    pausedRemainingSecondsRef.current = 0;
    isRefreshingRef.current = false;
    const nextDuration = calculateNextInterval();
    setCurrentIntervalDuration(nextDuration);
    setRemainingSeconds(nextDuration);

    try {
      await fetch('/api/runner/stop', { method: 'POST' });
    } catch (err) {
      console.error('Failed to notify backend runner stop:', err);
    }

    setLogs((prev) => [
      {
        id: `${Date.now()}-stop`,
        timestamp: new Date(),
        url: config.url,
        intervalUsed: currentIntervalDuration,
        status: 'warning',
        statusCode: 200,
        message: 'Auto-refresh loop stopped by user.',
        cacheBusterApplied: false,
      },
      ...prev.slice(0, 99),
    ]);
  };

  // Explicit PAUSE Function
  const handlePause = async () => {
    const remainingMs = Math.max(0, nextRefreshTimestampRef.current - Date.now());
    pausedRemainingSecondsRef.current = remainingMs / 1000;
    setRunnerStatus('paused');

    try {
      await fetch('/api/runner/pause', { method: 'POST' });
    } catch (err) {
      console.error('Failed to notify backend runner pause:', err);
    }
  };

  // Explicit RESUME Function
  const handleResume = async () => {
    const resumeDuration = pausedRemainingSecondsRef.current > 0.2
      ? pausedRemainingSecondsRef.current
      : calculateNextInterval();
    nextRefreshTimestampRef.current = Date.now() + resumeDuration * 1000;
    setRemainingSeconds(parseFloat(resumeDuration.toFixed(1)));
    isRefreshingRef.current = false;
    setRunnerStatus('running');

    try {
      await fetch('/api/runner/resume', { method: 'POST' });
    } catch (err) {
      console.error('Failed to notify backend runner resume:', err);
    }
  };

  // Instant Force Refresh
  const handleInstantRefresh = () => {
    triggerRefreshCycle(true);
  };

  // Reset Session Statistics & Logs
  const handleResetStats = async () => {
    const nextDuration = calculateNextInterval();
    try {
      await fetch('/api/runner/reset-stats', { method: 'POST' });
    } catch (err) {
      console.error('Failed to reset backend stats:', err);
    }
    setStats({
      totalRefreshes: 0,
      successfulRefreshes: 0,
      failedRefreshes: 0,
      averageLatencyMs: 0,
      startedAt: runnerStatus === 'running' ? new Date() : null,
      lastRefreshedAt: null,
    });
    setCycleCount(0);
    setUptimeSeconds(0);
    setCurrentIntervalDuration(nextDuration);
    setRemainingSeconds(nextDuration);
    setLogs([]);
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (runnerStatus === 'running') {
          handlePause();
        } else if (runnerStatus === 'paused') {
          handleResume();
        } else {
          handleStart();
        }
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleStop();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleInstantRefresh();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [runnerStatus, triggerRefreshCycle]);

  // Update Recent URLs list
  const addRecentUrl = (newUrl: string) => {
    if (!newUrl) return;
    setRecentUrls((prev) => {
      const updated = [newUrl, ...prev.filter((u) => u !== newUrl)].slice(0, 8);
      try {
        localStorage.setItem(LOCAL_STORAGE_RECENT_URLS, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  };

  const handleConfigChange = (changes: Partial<RefreshConfig>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...changes };
      if (changes.url && changes.url !== prev.url) {
        addRecentUrl(changes.url);
      }
      return updated;
    });

    if (
      changes.intervalType !== undefined ||
      changes.fixedSeconds !== undefined ||
      changes.randomMinSeconds !== undefined ||
      changes.randomMaxSeconds !== undefined
    ) {
      const nextDuration = calculateNextInterval();
      setCurrentIntervalDuration(nextDuration);
      if (runnerStatus !== 'running') {
        setRemainingSeconds(nextDuration);
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white relative">
      {/* Subtle ambient gradient mesh for depth */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.12),rgba(0,0,0,0))] pointer-events-none z-0" />

      {/* Top Navbar */}
      <div className="relative z-20">
        <Navbar
          runnerStatus={runnerStatus}
          onStart={handleStart}
          onStop={handleStop}
          onPause={handlePause}
          soundEnabled={config.soundNotification}
          onToggleSound={() => handleConfigChange({ soundNotification: !config.soundNotification })}
          onOpenRailwayModal={() => setIsRailwayModalOpen(true)}
          uptimeSeconds={uptimeSeconds}
          remainingSeconds={remainingSeconds}
        />
      </div>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 lg:p-8 space-y-6 relative z-10">
        {/* Persistent 24/7 Background Runner Status Banner */}
        <div className="bg-gradient-to-r from-indigo-950/40 via-zinc-900/90 to-emerald-950/30 border border-indigo-500/30 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-black/20">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-zinc-100">
                  Continuous 24/7 Server Keep-Alive & Background Runner
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                    isRunning
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : runnerStatus === 'paused'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isRunning ? 'bg-emerald-400 animate-ping' : 'bg-zinc-500'
                    }`}
                  />
                  {isRunning ? 'Active on Server 24/7' : runnerStatus === 'paused' ? 'Paused' : 'Ready'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                {isRunning
                  ? 'Refreshes continuously on the server backend even if you close this tab, switch apps, or leave your computer for hours.'
                  : 'Refreshes run persistently in the cloud background even when you leave or close this browser window.'}
              </p>
            </div>
          </div>
          {isRunning && (
            <div className="flex items-center gap-3 self-end sm:self-center shrink-0 border-t sm:border-t-0 sm:border-l border-zinc-800 pt-2 sm:pt-0 sm:pl-4">
              <div className="text-left sm:text-right">
                <span className="text-[10px] text-zinc-400 block font-mono">Completed Refreshes</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  {stats.totalRefreshes} cycles
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Top Control Grid: URL Input + Interval Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Target Website & Master Controls */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            <UrlInputBar
              config={config}
              onChangeConfig={handleConfigChange}
              onInstantRefresh={handleInstantRefresh}
              isRunning={isRunning}
              recentUrls={recentUrls}
              onSelectRecentUrl={(selectedUrl) => handleConfigChange({ url: selectedUrl })}
            />

            {/* Master Tactile Start / Stop / Pause / Resume Controls */}
            <ControlBar
              runnerStatus={runnerStatus}
              onStart={handleStart}
              onStop={handleStop}
              onPause={handlePause}
              onResume={handleResume}
              onInstantRefresh={handleInstantRefresh}
              onResetStats={handleResetStats}
              remainingSeconds={remainingSeconds}
              totalIntervalSeconds={currentIntervalDuration}
              isRefreshingNow={isRefreshingNow}
              currentCycleCount={cycleCount}
              maxCycles={config.maxCycles}
            />
          </div>

          {/* Right Column: Timing & Interval Configuration */}
          <div className="lg:col-span-5">
            <IntervalConfig
              config={config}
              onChangeConfig={handleConfigChange}
              nextScheduledSeconds={currentIntervalDuration}
            />
          </div>
        </div>

        {/* Telemetry Metrics Row */}
        <MetricsCards
          stats={stats}
          uptimeSeconds={uptimeSeconds}
          lastPing={lastPing}
          runnerStatus={runnerStatus}
        />

        {/* View Layout Tabs & Keyboard Hints */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center bg-zinc-900/90 p-1 rounded-xl border border-zinc-800/90 shadow-sm text-xs font-semibold">
            <button
              id="view-tab-split"
              type="button"
              onClick={() => setActiveView('split')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeView === 'split' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
              <span>Split View</span>
            </button>
            <button
              id="view-tab-preview"
              type="button"
              onClick={() => setActiveView('preview')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeView === 'preview' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              <span>Live Preview Only</span>
            </button>
            <button
              id="view-tab-logs"
              type="button"
              onClick={() => setActiveView('logs')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeView === 'logs' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span>Activity Logs Only</span>
            </button>
          </div>

          {/* Keyboard shortcuts reminder */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-400 font-medium">
            <span className="inline-flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded-md bg-zinc-800/90 border border-zinc-700 font-mono text-[10px] text-zinc-300 shadow-2xs">
                Space
              </kbd>
              <span>Play / Pause</span>
            </span>
            <span className="text-zinc-700">•</span>
            <span className="inline-flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded-md bg-zinc-800/90 border border-zinc-700 font-mono text-[10px] text-zinc-300 shadow-2xs">
                S
              </kbd>
              <span>Stop</span>
            </span>
            <span className="text-zinc-700">•</span>
            <span className="inline-flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded-md bg-zinc-800/90 border border-zinc-700 font-mono text-[10px] text-zinc-300 shadow-2xs">
                R
              </kbd>
              <span>Refresh Now</span>
            </span>
          </div>
        </div>

        {/* Live Preview / Activity Logs Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {(activeView === 'split' || activeView === 'preview') && (
            <div className={activeView === 'split' ? 'lg:col-span-8' : 'lg:col-span-12'}>
              <LiveFrame
                url={config.url}
                refreshKey={refreshKey}
                isLoading={isRefreshingNow}
                onManualRefresh={handleInstantRefresh}
                lastPing={lastPing}
                mode={config.refreshMode}
              />
            </div>
          )}

          {(activeView === 'split' || activeView === 'logs') && (
            <div className={activeView === 'split' ? 'lg:col-span-4' : 'lg:col-span-12'}>
              <ActivityLog logs={logs} onClearLogs={() => setLogs([])} />
            </div>
          )}
        </div>
      </main>

      {/* Railway Deployment Modal */}
      <RailwayDeployModal
        isOpen={isRailwayModalOpen}
        onClose={() => setIsRailwayModalOpen(false)}
      />
    </div>
  );
}
