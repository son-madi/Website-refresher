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
import { LayoutGrid, Eye, Terminal, Play, Square, Pause, RotateCcw } from 'lucide-react';
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

  // Calculate next cycle duration based on current config
  const calculateNextInterval = useCallback((): number => {
    if (config.intervalType === 'random') {
      const min = Math.min(config.randomMinSeconds, config.randomMaxSeconds);
      const max = Math.max(config.randomMinSeconds, config.randomMaxSeconds);
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    return Math.max(5, config.fixedSeconds);
  }, [config.intervalType, config.randomMinSeconds, config.randomMaxSeconds, config.fixedSeconds]);

  // Persist config changes
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_SAVED_CONFIG, JSON.stringify(config));
    } catch {
      // Ignore
    }
  }, [config]);

  // Execute single refresh event
  const triggerRefreshCycle = useCallback(async () => {
    if (!config.url) return;

    setIsRefreshingNow(true);

    if (config.soundNotification) {
      playRefreshChime();
    }

    // Always increment key to reload iframe if in dual or iframe mode
    if (config.refreshMode === 'dual' || config.refreshMode === 'iframe') {
      setRefreshKey((prev) => prev + 1);
    }

    let pingOutcome: PingResult | null = null;
    const intervalUsed = currentIntervalDuration;

    // Trigger HTTP ping check if in dual or ping mode
    if (config.refreshMode === 'dual' || config.refreshMode === 'ping') {
      try {
        const res = await fetch(`/api/ping?url=${encodeURIComponent(config.url)}`);
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
          url: config.url,
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
      if (config.maxCycles > 0 && newCount >= config.maxCycles) {
        setTimeout(() => {
          setRunnerStatus('stopped');
          setLogs((l) => [
            {
              id: `${Date.now()}-limit`,
              timestamp: new Date(),
              url: config.url,
              intervalUsed,
              status: 'warning',
              statusCode: 200,
              message: `Completed target limit of ${config.maxCycles} refreshes. Auto-stopped.`,
              cacheBusterApplied: false,
            },
            ...l,
          ]);
        }, 100);
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
      url: config.url,
      intervalUsed,
      status: isSuccess ? 'success' : 'error',
      statusCode: pingOutcome?.status || 200,
      latencyMs: latency,
      message: pingOutcome?.statusText || 'Refreshed successfully',
      cacheBusterApplied: config.useCacheBuster,
    };

    setLogs((prev) => [newLogEntry, ...prev.slice(0, 99)]);

    // Reset countdown for next iteration
    const nextDuration = calculateNextInterval();
    setCurrentIntervalDuration(nextDuration);
    setRemainingSeconds(nextDuration);

    setTimeout(() => {
      setIsRefreshingNow(false);
    }, 400);
  }, [config, currentIntervalDuration, calculateNextInterval]);

  // Main countdown timer loop
  useEffect(() => {
    if (runnerStatus !== 'running') return;

    const intervalTimer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 0.1) {
          triggerRefreshCycle();
          return 0;
        }
        return Math.max(0, prev - 0.1);
      });
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

  // Explicit START Function
  const handleStart = () => {
    if (!stats.startedAt) {
      setStats((prev) => ({ ...prev, startedAt: new Date() }));
    }
    const nextDuration = calculateNextInterval();
    setCurrentIntervalDuration(nextDuration);
    setRemainingSeconds(nextDuration);
    setRunnerStatus('running');

    // Add log event
    setLogs((prev) => [
      {
        id: `${Date.now()}-start`,
        timestamp: new Date(),
        url: config.url,
        intervalUsed: nextDuration,
        status: 'success',
        statusCode: 200,
        message: `Auto-refresh started. Cycle interval: ${nextDuration}s`,
        cacheBusterApplied: config.useCacheBuster,
      },
      ...prev.slice(0, 99),
    ]);
  };

  // Explicit STOP Function
  const handleStop = () => {
    setRunnerStatus('stopped');
    const nextDuration = calculateNextInterval();
    setRemainingSeconds(nextDuration);

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
  const handlePause = () => {
    setRunnerStatus('paused');
  };

  // Explicit RESUME Function
  const handleResume = () => {
    setRunnerStatus('running');
  };

  // Instant Force Refresh
  const handleInstantRefresh = () => {
    triggerRefreshCycle();
  };

  // Reset Session Statistics & Logs
  const handleResetStats = () => {
    const nextDuration = calculateNextInterval();
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
    <div className="min-h-screen bg-zinc-100/70 text-zinc-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        runnerStatus={runnerStatus}
        onStart={handleStart}
        onStop={handleStop}
        onPause={handlePause}
        soundEnabled={config.soundNotification}
        onToggleSound={() => handleConfigChange({ soundNotification: !config.soundNotification })}
        onOpenRailwayModal={() => setIsRailwayModalOpen(true)}
        uptimeSeconds={uptimeSeconds}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
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
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div className="flex items-center bg-white p-1 rounded-xl border border-zinc-200 shadow-2xs text-xs font-semibold">
            <button
              id="view-tab-split"
              type="button"
              onClick={() => setActiveView('split')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeView === 'split' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Split View</span>
            </button>
            <button
              id="view-tab-preview"
              type="button"
              onClick={() => setActiveView('preview')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeView === 'preview' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Preview Only</span>
            </button>
            <button
              id="view-tab-logs"
              type="button"
              onClick={() => setActiveView('logs')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeView === 'logs' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Activity Logs Only</span>
            </button>
          </div>

          {/* Keyboard shortcuts reminder */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-500 font-medium">
            <span className="inline-flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded-md bg-zinc-200/80 border border-zinc-300 font-mono text-[10px] text-zinc-700 shadow-2xs">
                Space
              </kbd>
              <span>Play / Pause</span>
            </span>
            <span className="text-zinc-300">•</span>
            <span className="inline-flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded-md bg-zinc-200/80 border border-zinc-300 font-mono text-[10px] text-zinc-700 shadow-2xs">
                S
              </kbd>
              <span>Stop</span>
            </span>
            <span className="text-zinc-300">•</span>
            <span className="inline-flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded-md bg-zinc-200/80 border border-zinc-300 font-mono text-[10px] text-zinc-700 shadow-2xs">
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
