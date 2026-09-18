import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Health endpoint for Railway and monitoring checks
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'auto-website-refresher',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Ping endpoint: Refreshes/pings any target website via server HTTP request
  // Useful for keeping websites alive on Railway/Render/Glitch/Heroku
  // and checking HTTP response status, latency, and iframe embeddability
  app.get('/api/ping', async (req: Request, res: Response) => {
    const targetUrl = req.query.url as string;

    if (!targetUrl) {
      res.status(400).json({ error: 'URL query parameter is required' });
      return;
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl.startsWith('http://') || targetUrl.startsWith('https://') 
        ? targetUrl 
        : `https://${targetUrl}`);
    } catch {
      res.status(400).json({ error: 'Invalid URL format' });
      return;
    }

    const startTime = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      // Attempt HEAD request first for efficiency, fallback to GET if disallowed
      let response: globalThis.Response;
      try {
        response = await fetch(parsedUrl.toString(), {
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AutoWebRefresher/1.0; KeepAliveBot)',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        });
      } catch {
        // If HEAD fails or is rejected, retry with GET
        response = await fetch(parsedUrl.toString(), {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AutoWebRefresher/1.0; KeepAliveBot)',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const latencyMs = Math.round(performance.now() - startTime);
      const xFrameOptions = response.headers.get('x-frame-options');
      const csp = response.headers.get('content-security-policy') || '';
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
        statusText: isTimeout ? 'Request Timeout (12s)' : (error.message || 'Network Fetch Failed'),
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
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Auto Website Refresher running on port ${PORT}`);
  });
}

startServer();
