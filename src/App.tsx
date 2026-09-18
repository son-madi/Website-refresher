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
import { RefreshConfig, RefreshLogEntry, SessionStats, PingResult } from './types';
import { playRefreshChime } from './utils/audio';
import { LayoutGrid, Eye, Terminal } from 'lucide-react';

const LOCAL_STORAGE_RECENT_URLS = 'auto_refresher_recent_urls';
const LOCAL_STORAGE_SAVED_CONFIG = 'auto_refresher_config';

export default function App() {
  // Config state
  const [config, setConfig] = useState<RefreshConfig>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SAVED_CONFIG);
      if (saved) {
        return JSON.parse(saved);
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
    };
  });

  const [isRunning, setIsRunning] = useState<boolean>(false);
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
    return ['https://example.com', 'https://httpbin.org/get'];
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

  // Execute single refresh event (for both scheduled loop and instant button)
  const triggerRefreshCycle = useCallback(async () => {
    if (!config.url) return;

    setIsRefreshingNow(true);

    if (config.soundNotification) {
      playRefreshChime();
    }

    // Determine target URL with cache buster query if enabled
    let finalUrl = config.url;
    if (config.useCacheBuster) {
      const separator = finalUrl.includes('?') ? '&' : '?';
      finalUrl = `${finalUrl}${separator}_t=${Date.now()}`;
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

    setLogs((prev) => [newLogEntry, ...prev.slice(0, 99)]); // Keep last 100 entries

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
    if (!isRunning) return;

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
  }, [isRunning, triggerRefreshCycle]);

  // Session Uptime clock
  useEffect(() => {
    if (!isRunning) return;

    const uptimeTimer = setInterval(() => {
      setUptimeSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(uptimeTimer);
  }, [isRunning]);

  // Global Keyboard Shortcuts (Space to play/pause, 'R' to refresh immediately)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsRunning((prev) => !prev);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        triggerRefreshCycle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerRefreshCycle]);

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

    // If interval settings changed, adjust current interval
    if (
      changes.intervalType !== undefined ||
      changes.fixedSeconds !== undefined ||
      changes.randomMinSeconds !== undefined ||
      changes.randomMaxSeconds !== undefined
    ) {
      const nextDuration = calculateNextInterval();
      setCurrentIntervalDuration(nextDuration);
      setRemainingSeconds(nextDuration);
    }
  };

  const handleTogglePlay = () => {
    if (!isRunning && !stats.startedAt) {
      setStats((prev) => ({ ...prev, startedAt: new Date() }));
      const nextDuration = calculateNextInterval();
      setCurrentIntervalDuration(nextDuration);
      setRemainingSeconds(nextDuration);
    }
    setIsRunning((prev) => !prev);
  };

  const handleInstantRefresh = () => {
    triggerRefreshCycle();
  };

  const handleResetStats = () => {
    const nextDuration = calculateNextInterval();
    setStats({
      totalRefreshes: 0,
      successfulRefreshes: 0,
      failedRefreshes: 0,
      averageLatencyMs: 0,
      startedAt: isRunning ? new Date() : null,
      lastRefreshedAt: null,
    });
    setUptimeSeconds(0);
    setCurrentIntervalDuration(nextDuration);
    setRemainingSeconds(nextDuration);
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-zinc-100/70 text-zinc-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        isRunning={isRunning}
        onTogglePlay={handleTogglePlay}
        soundEnabled={config.soundNotification}
        onToggleSound={() => handleConfigChange({ soundNotification: !config.soundNotification })}
        onOpenRailwayModal={() => setIsRailwayModalOpen(true)}
        uptimeSeconds={uptimeSeconds}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Control Grid: URL Input + Interval Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Website URL & Mode Configuration */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            <UrlInputBar
              config={config}
              onChangeConfig={handleConfigChange}
              onInstantRefresh={handleInstantRefresh}
              isRunning={isRunning}
              recentUrls={recentUrls}
              onSelectRecentUrl={(selectedUrl) => handleConfigChange({ url: selectedUrl })}
            />

            {/* Master Control Bar (Play/Pause, Countdown bar, Refresh Now) */}
            <ControlBar
              isRunning={isRunning}
              onTogglePlay={handleTogglePlay}
              onInstantRefresh={handleInstantRefresh}
              onResetStats={handleResetStats}
              remainingSeconds={remainingSeconds}
              totalIntervalSeconds={currentIntervalDuration}
              isRefreshingNow={isRefreshingNow}
            />
          </div>

          {/* Right: Interval Configurator (10 to 45 seconds or custom seconds/minutes) */}
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
          isRunning={isRunning}
        />

        {/* View Layout Tabs & Actions */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <div className="flex items-center bg-white p-1 rounded-xl border border-zinc-200 shadow-2xs text-xs font-medium">
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

          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200/80 border border-zinc-300 font-mono text-[10px]">Space</kbd>
              <span>Play/Pause</span>
            </span>
            <span className="text-zinc-300">•</span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200/80 border border-zinc-300 font-mono text-[10px]">R</kbd>
              <span>Refresh Now</span>
            </span>
          </div>
        </div>

        {/* Main Stage View: Split or Single */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Live Preview Window */}
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

          {/* Activity Logs Panel */}
          {(activeView === 'split' || activeView === 'logs') && (
            <div className={activeView === 'split' ? 'lg:col-span-4' : 'lg:col-span-12'}>
              <ActivityLog logs={logs} onClearLogs={() => setLogs([])} />
            </div>
          )}
        </div>
      </main>

      {/* Railway Deployment Instructions Modal */}
      <RailwayDeployModal
        isOpen={isRailwayModalOpen}
        onClose={() => setIsRailwayModalOpen(false)}
      />
    </div>
  );
}
