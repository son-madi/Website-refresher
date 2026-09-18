import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

interface ServerLogEntry {
  id: string;
  timestamp: string;
  url: string;
  intervalUsed: number;
  status: 'pending' | 'success' | 'warning' | 'error';
  statusCode?: number;
  latencyMs?: number;
  message?: string;
  cacheBusterApplied: boolean;
}

interface ServerRunnerState {
  targetUrl: string;
  isRunning: boolean;
  runnerStatus: 'idle' | 'running' | 'paused';
  startedAt: string | null;
  intervalType: 'fixed' | 'random';
  fixedSeconds: number;
  randomMinSeconds: number;
  randomMaxSeconds: number;
  refreshMode: 'dual' | 'iframe' | 'ping';
  useCacheBuster: boolean;
  nextRefreshTimestamp: number | null;
  lastRefreshAt: string | null;
  cycleCount: number;
  stats: {
    totalRefreshes: number;
    successfulRefreshes: number;
    failedRefreshes: number;
    averageLatencyMs: number;
    totalLatencyMs: number;
  };
  lastPing: {
    ok: boolean;
    status: number;
    statusText: string;
    latencyMs: number;
    contentType: string;
    blocksIframe: boolean;
    xFrameOptions?: string | null;
    isRailway?: boolean;
    url: string;
    timestamp: string;
    error?: string;
  } | null;
  logs: ServerLogEntry[];
}

// In-memory state for persistent background runner
const runnerState: ServerRunnerState = {
  targetUrl: '',
  isRunning: false,
  runnerStatus: 'idle',
  startedAt: null,
  intervalType: 'fixed',
  fixedSeconds: 15,
  randomMinSeconds: 10,
  randomMaxSeconds: 45,
  refreshMode: 'dual',
  useCacheBuster: false,
  nextRefreshTimestamp: null,
  lastRefreshAt: null,
  cycleCount: 0,
  stats: {
    totalRefreshes: 0,
    successfulRefreshes: 0,
    failedRefreshes: 0,
    averageLatencyMs: 0,
    totalLatencyMs: 0,
  },
  lastPing: null,
  logs: [],
};

let runnerTimer: NodeJS.Timeout | null = null;
const STATE_FILE_PATH = path.resolve(process.cwd(), 'runner-state.json');

// Save runner state to file so it survives cold boots
function persistRunnerState() {
  try {
    const dataToSave = {
      ...runnerState,
      logs: runnerState.logs.slice(0, 50),
    };
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(dataToSave, null, 2));
  } catch (err) {
    console.error('Failed to persist runner state:', err);
  }
}

// Load runner state on startup if available
function loadPersistedRunnerState() {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const raw = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
      const saved = JSON.parse(raw);
      if (saved && typeof saved === 'object') {
        Object.assign(runnerState, saved);
        // If it was running when server closed, automatically resume refreshing
        if (runnerState.isRunning && runnerState.runnerStatus === 'running' && runnerState.targetUrl) {
          console.log(`[Auto-Refresher] Resuming persistent background refresh for ${runnerState.targetUrl}`);
          scheduleNextCycle(1);
        }
      }
    }
  } catch (err) {
    console.error('Failed to load persisted runner state:', err);
  }
}

function calculateNextIntervalSeconds(): number {
  if (runnerState.intervalType === 'random') {
    const min = Math.max(1, runnerState.randomMinSeconds);
    const max = Math.max(min, runnerState.randomMaxSeconds);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  return Math.max(1, runnerState.fixedSeconds);
}

// Core execution cycle that pings the target website 24/7 on the server
async function executeRefreshCycle() {
  if (!runnerState.isRunning || runnerState.runnerStatus !== 'running' || !runnerState.targetUrl) {
    return;
  }

  const clean = runnerState.targetUrl.trim();
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(clean.startsWith('http://') || clean.startsWith('https://') ? clean : `https://${clean}`);
  } catch {
    console.error('[Auto-Refresher] Invalid URL:', clean);
    return;
  }

  // Apply cache-buster query param if enabled
  const fetchUrl = new URL(parsedUrl.toString());
  if (runnerState.useCacheBuster) {
    fetchUrl.searchParams.set('_keepalive_cb', Date.now().toString());
  }

  const startTime = performance.now();
  let statusCode = 500;
  let statusText = 'Error';
  let isOk = false;
  let latencyMs = 0;
  let xFrameOptions: string | null = null;
  let blocksIframe = false;
  let isRailway = false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(fetchUrl.toString(), {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 (Keep-Alive Engine)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    }).finally(() => clearTimeout(timeoutId));

    latencyMs = Math.round(performance.now() - startTime);
    statusCode = response.status;
    statusText = response.statusText || (response.ok ? 'OK' : 'Error');
    isOk = response.ok;

    xFrameOptions = response.headers.get('x-frame-options');
    const csp = response.headers.get('content-security-policy') || '';
    const serverHeader = response.headers.get('server') || '';
    isRailway = parsedUrl.hostname.endsWith('railway.app') ||
                serverHeader.toLowerCase().includes('railway') ||
                response.headers.has('x-railway-router');

    blocksIframe = Boolean(
      (xFrameOptions && ['DENY', 'SAMEORIGIN'].includes(xFrameOptions.toUpperCase())) ||
      (csp && csp.toLowerCase().includes('frame-ancestors'))
    );
  } catch (err: unknown) {
    latencyMs = Math.round(performance.now() - startTime);
    const error = err as Error;
    const isTimeout = error.name === 'AbortError';
    statusCode = isTimeout ? 408 : 502;
    statusText = isTimeout ? 'Timeout' : (error.message || 'Fetch Failed');
    isOk = false;
  }

  // Update telemetry
  runnerState.cycleCount += 1;
  runnerState.stats.totalRefreshes += 1;
  if (isOk) {
    runnerState.stats.successfulRefreshes += 1;
  } else {
    runnerState.stats.failedRefreshes += 1;
  }
  runnerState.stats.totalLatencyMs += latencyMs;
  runnerState.stats.averageLatencyMs = Math.round(
    runnerState.stats.totalLatencyMs / runnerState.stats.totalRefreshes
  );

  runnerState.lastRefreshAt = new Date().toISOString();
  runnerState.lastPing = {
    ok: isOk,
    status: statusCode,
    statusText,
    latencyMs,
    contentType: 'text/html',
    blocksIframe,
    xFrameOptions,
    isRailway,
    url: parsedUrl.toString(),
    timestamp: runnerState.lastRefreshAt,
  };

  // Add to in-memory audit log (capped at 100)
  const logEntry: ServerLogEntry = {
    id: `srv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: runnerState.lastRefreshAt,
    url: parsedUrl.toString(),
    intervalUsed: Math.round(latencyMs / 100) / 10,
    status: isOk ? 'success' : statusCode < 400 ? 'warning' : 'error',
    statusCode,
    latencyMs,
    message: isOk ? `Refreshed successfully (${statusCode})` : `HTTP ${statusCode}: ${statusText}`,
    cacheBusterApplied: runnerState.useCacheBuster,
  };

  runnerState.logs.unshift(logEntry);
  if (runnerState.logs.length > 100) {
    runnerState.logs.pop();
  }

  console.log(`[Auto-Refresher] Ping ${runnerState.cycleCount} to ${clean} - ${statusCode} (${latencyMs}ms)`);

  // Persist state periodically
  persistRunnerState();

  // Schedule next refresh cycle
  if (runnerState.isRunning && runnerState.runnerStatus === 'running') {
    const nextIntervalSec = calculateNextIntervalSeconds();
    logEntry.intervalUsed = nextIntervalSec;
    scheduleNextCycle(nextIntervalSec);
  }
}

function scheduleNextCycle(delaySeconds: number) {
  if (runnerTimer) {
    clearTimeout(runnerTimer);
    runnerTimer = null;
  }
  runnerState.nextRefreshTimestamp = Date.now() + delaySeconds * 1000;
  runnerTimer = setTimeout(() => {
    executeRefreshCycle().catch((err) => {
      console.error('[Auto-Refresher] Error during refresh cycle:', err);
    });
  }, delaySeconds * 1000);
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Load any previously persisted state
  loadPersistedRunnerState();

  // Health endpoint for Railway, monitoring, and keep-alive checks
  app.all(['/api/health', '/health', '/ping'], (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'auto-website-refresher',
      uptime: process.uptime(),
      port: PORT,
      backgroundRunner: {
        isRunning: runnerState.isRunning,
        status: runnerState.runnerStatus,
        targetUrl: runnerState.targetUrl,
        totalRefreshes: runnerState.stats.totalRefreshes,
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Runner API: Get current background status (polled by browser or retrieved after tab reopen)
  app.get('/api/runner/status', (_req: Request, res: Response) => {
    const uptimeSec = runnerState.startedAt
      ? Math.floor((Date.now() - new Date(runnerState.startedAt).getTime()) / 1000)
      : 0;

    const remainingSec = runnerState.nextRefreshTimestamp
      ? Math.max(0, Math.ceil((runnerState.nextRefreshTimestamp - Date.now()) / 1000))
      : 0;

    res.json({
      isRunning: runnerState.isRunning,
      runnerStatus: runnerState.runnerStatus,
      targetUrl: runnerState.targetUrl,
      startedAt: runnerState.startedAt,
      uptimeSeconds: uptimeSec,
      intervalType: runnerState.intervalType,
      fixedSeconds: runnerState.fixedSeconds,
      randomMinSeconds: runnerState.randomMinSeconds,
      randomMaxSeconds: runnerState.randomMaxSeconds,
      refreshMode: runnerState.refreshMode,
      useCacheBuster: runnerState.useCacheBuster,
      nextRefreshTimestamp: runnerState.nextRefreshTimestamp,
      remainingSeconds: remainingSec,
      stats: runnerState.stats,
      lastPing: runnerState.lastPing,
      logs: runnerState.logs,
      serverTime: Date.now(),
    });
  });

  // Runner API: Start 24/7 background refresh loop
  app.post('/api/runner/start', (req: Request, res: Response) => {
    const {
      url,
      intervalType = 'fixed',
      fixedSeconds = 15,
      randomMinSeconds = 10,
      randomMaxSeconds = 45,
      refreshMode = 'dual',
      useCacheBuster = false,
    } = req.body || {};

    if (!url || typeof url !== 'string' || !url.trim()) {
      res.status(400).json({ error: 'Target URL is required' });
      return;
    }

    runnerState.targetUrl = url.trim();
    runnerState.intervalType = intervalType === 'random' ? 'random' : 'fixed';
    runnerState.fixedSeconds = Number(fixedSeconds) || 15;
    runnerState.randomMinSeconds = Number(randomMinSeconds) || 10;
    runnerState.randomMaxSeconds = Number(randomMaxSeconds) || 45;
    runnerState.refreshMode = refreshMode;
    runnerState.useCacheBuster = Boolean(useCacheBuster);

    if (!runnerState.startedAt || runnerState.runnerStatus === 'idle') {
      runnerState.startedAt = new Date().toISOString();
    }
    runnerState.isRunning = true;
    runnerState.runnerStatus = 'running';

    // Persist and schedule first cycle immediately
    persistRunnerState();
    scheduleNextCycle(1);

    console.log(`[Auto-Refresher] Started 24/7 background refresh loop for ${runnerState.targetUrl}`);
    res.json({ success: true, message: 'Background runner started', state: runnerState });
  });

  // Runner API: Pause loop
  app.post('/api/runner/pause', (_req: Request, res: Response) => {
    if (runnerTimer) {
      clearTimeout(runnerTimer);
      runnerTimer = null;
    }
    runnerState.runnerStatus = 'paused';
    runnerState.nextRefreshTimestamp = null;
    persistRunnerState();

    console.log('[Auto-Refresher] Paused background refresh loop');
    res.json({ success: true, message: 'Background runner paused', state: runnerState });
  });

  // Runner API: Resume loop
  app.post('/api/runner/resume', (_req: Request, res: Response) => {
    if (!runnerState.targetUrl) {
      res.status(400).json({ error: 'No target URL configured' });
      return;
    }

    runnerState.isRunning = true;
    runnerState.runnerStatus = 'running';
    const nextSec = calculateNextIntervalSeconds();
    scheduleNextCycle(nextSec);
    persistRunnerState();

    console.log('[Auto-Refresher] Resumed background refresh loop');
    res.json({ success: true, message: 'Background runner resumed', state: runnerState });
  });

  // Runner API: Stop loop
  app.post('/api/runner/stop', (_req: Request, res: Response) => {
    if (runnerTimer) {
      clearTimeout(runnerTimer);
      runnerTimer = null;
    }
    runnerState.isRunning = false;
    runnerState.runnerStatus = 'idle';
    runnerState.nextRefreshTimestamp = null;
    persistRunnerState();

    console.log('[Auto-Refresher] Stopped background refresh loop');
    res.json({ success: true, message: 'Background runner stopped', state: runnerState });
  });

  // Runner API: Reset statistics & logs
  app.post('/api/runner/reset-stats', (_req: Request, res: Response) => {
    runnerState.stats = {
      totalRefreshes: 0,
      successfulRefreshes: 0,
      failedRefreshes: 0,
      averageLatencyMs: 0,
      totalLatencyMs: 0,
    };
    runnerState.cycleCount = 0;
    runnerState.logs = [];
    runnerState.startedAt = runnerState.isRunning ? new Date().toISOString() : null;
    persistRunnerState();

    res.json({ success: true, message: 'Stats and logs reset' });
  });

  // Manual Ping endpoint for instant on-demand tests
  app.get('/api/ping', async (req: Request, res: Response) => {
    const targetUrl = req.query.url as string;

    if (!targetUrl) {
      res.status(400).json({ error: 'URL query parameter is required' });
      return;
    }

    let parsedUrl: URL;
    try {
      const clean = targetUrl.trim();
      parsedUrl = new URL(clean.startsWith('http://') || clean.startsWith('https://') 
        ? clean 
        : `https://${clean}`);
    } catch {
      res.status(400).json({ error: 'Invalid URL format' });
      return;
    }

    const startTime = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      let response: globalThis.Response;
      const requestHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      };

      try {
        response = await fetch(parsedUrl.toString(), {
          method: 'GET',
          signal: controller.signal,
          redirect: 'follow',
          headers: requestHeaders,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const latencyMs = Math.round(performance.now() - startTime);
      const xFrameOptions = response.headers.get('x-frame-options');
      const csp = response.headers.get('content-security-policy') || '';
      const serverHeader = response.headers.get('server') || '';
      const isRailway = parsedUrl.hostname.endsWith('railway.app') || 
                        serverHeader.toLowerCase().includes('railway') || 
                        response.headers.has('x-railway-router');

      const blocksIframe = Boolean(
        (xFrameOptions && ['DENY', 'SAMEORIGIN'].includes(xFrameOptions.toUpperCase())) ||
        (csp && csp.toLowerCase().includes('frame-ancestors'))
      );

      res.json({
        ok: response.ok,
        status: response.status,
        statusText: response.statusText || (response.ok ? 'OK' : 'Error'),
        latencyMs,
        contentType: response.headers.get('content-type') || 'unknown',
        blocksIframe,
        xFrameOptions: xFrameOptions || null,
        isRailway,
        url: parsedUrl.toString(),
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const latencyMs = Math.round(performance.now() - startTime);
      const error = err as Error;
      const isTimeout = error.name === 'AbortError';

      res.status(200).json({
        ok: false,
        status: isTimeout ? 408 : 502,
        statusText: isTimeout ? 'Request Timeout (25s - server may be cold booting)' : (error.message || 'Network Fetch Failed'),
        latencyMs,
        contentType: 'none',
        blocksIframe: false,
        url: parsedUrl.toString(),
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  });

  // Vite middleware in dev or static files in prod
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));

    app.get('/', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });

    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Auto Website Refresher running on port ${PORT} (0.0.0.0)`);
  });
}

startServer();

