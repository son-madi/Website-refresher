import express, { Request, Response } from 'express';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Health endpoint for Railway, monitoring, and keep-alive checks
  // Supports GET and HEAD on multiple paths
  app.all(['/api/health', '/health', '/ping'], (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'auto-website-refresher',
      uptime: process.uptime(),
      port: PORT,
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
      // 25 second timeout to allow cold-starting Railway / Render sleeping containers
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      let response: globalThis.Response;
      const requestHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
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
