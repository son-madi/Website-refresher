import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink, RefreshCw, Maximize2, Minimize2, ZoomIn, ZoomOut, AlertCircle, ShieldAlert, CheckCircle } from 'lucide-react';
import { PingResult } from '../types';

interface LiveFrameProps {
  url: string;
  refreshKey: number;
  isLoading: boolean;
  onManualRefresh: () => void;
  lastPing: PingResult | null;
  mode: 'dual' | 'iframe' | 'ping';
}

export const LiveFrame: React.FC<LiveFrameProps> = ({
  url,
  refreshKey,
  isLoading,
  onManualRefresh,
  lastPing,
  mode,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [iframeError, setIframeError] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Construct current URL with key/timestamp
  const cleanUrl = url.trim();
  const displayUrl = cleanUrl || 'about:blank';

  const blocksIframe = lastPing?.blocksIframe || iframeError;

  useEffect(() => {
    // Reset iframe error on new URL
    setIframeError(false);
  }, [url]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-[600px] min-h-[480px]'
      }`}
    >
      {/* Mock Browser Header Bar */}
      <div className="bg-zinc-100/90 border-b border-zinc-200 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
        {/* Browser window controls */}
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-400/80 inline-block"></span>
          <span className="w-3 h-3 rounded-full bg-amber-400/80 inline-block"></span>
          <span className="w-3 h-3 rounded-full bg-emerald-400/80 inline-block"></span>
        </div>

        {/* Browser address bar */}
        <div className="flex-1 max-w-xl mx-auto flex items-center bg-white border border-zinc-200/80 rounded-lg px-3 py-1 text-xs text-zinc-600 font-mono shadow-2xs">
          <span className="text-zinc-400 mr-1.5">🔒</span>
          <span className="truncate flex-1">{url || 'No URL specified yet'}</span>
          {isLoading && (
            <RefreshCw className="w-3 h-3 text-indigo-600 animate-spin ml-1.5 shrink-0" />
          )}
        </div>

        {/* Window actions */}
        <div className="flex items-center gap-1 text-zinc-500">
          {/* Zoom controls */}
          <button
            type="button"
            onClick={() => setZoomLevel((prev) => Math.max(50, prev - 25))}
            className="p-1.5 hover:text-zinc-900 hover:bg-zinc-200/60 rounded-md transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono px-1">{zoomLevel}%</span>
          <button
            type="button"
            onClick={() => setZoomLevel((prev) => Math.min(150, prev + 25))}
            className="p-1.5 hover:text-zinc-900 hover:bg-zinc-200/60 rounded-md transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-zinc-200 mx-1" />

          <button
            type="button"
            onClick={onManualRefresh}
            className="p-1.5 hover:text-zinc-900 hover:bg-zinc-200/60 rounded-md transition-colors"
            title="Reload Frame"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              className="p-1.5 hover:text-zinc-900 hover:bg-zinc-200/60 rounded-md transition-colors"
              title="Open in new window"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 hover:text-zinc-900 hover:bg-zinc-200/60 rounded-md transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Frame / Fallback Content */}
      <div className="relative flex-1 bg-zinc-50 overflow-hidden">
        {!cleanUrl ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-zinc-400">
            <RefreshCw className="w-10 h-10 mb-3 text-zinc-300" />
            <h3 className="text-sm font-semibold text-zinc-700 mb-1">No Target Website Set</h3>
            <p className="text-xs max-w-sm">Enter a URL in the field above or pick a sample site to begin auto-refreshing.</p>
          </div>
        ) : mode === 'ping' ? (
          /* When in Ping Mode only */
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center mb-3">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 mb-1">Server Keep-Alive Mode Active</h3>
            <p className="text-xs text-zinc-500 max-w-md mb-4">
              Requests are being dispatched directly to <code className="bg-zinc-200/70 px-1.5 py-0.5 rounded text-zinc-800">{url}</code> via HTTP pings. This keeps your Railway/Render dynos awake with zero DOM overhead.
            </p>
            <a
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 transition-colors shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Target in New Tab</span>
            </a>
          </div>
        ) : blocksIframe ? (
          /* When website blocks iframe embedding via X-Frame-Options or CSP */
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-50">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 mb-1">Target Website Disallows Iframe Embedding</h3>
            <p className="text-xs text-zinc-500 max-w-md mb-2">
              <strong className="font-semibold text-zinc-700">{url}</strong> sends an security header (<code>X-Frame-Options: {lastPing?.xFrameOptions || 'DENY'}</code> or CSP) preventing browser frame embedding.
            </p>
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-xs max-w-md mb-4 text-left">
              <div className="font-semibold flex items-center gap-1.5 mb-0.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Auto-Refresh & Keep-Alive Are Still Active!</span>
              </div>
              <p className="text-emerald-700 text-[11px]">
                The server is successfully pinging and keeping this URL alive on schedule. You can view the live status in the Activity Log or open the page in a tab.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Target in New Window</span>
              </a>
              <button
                type="button"
                onClick={() => setIframeError(false)}
                className="px-3 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-200/60 border border-zinc-200 transition-colors"
              >
                Retry Embedding
              </button>
            </div>
          </div>
        ) : (
          /* Live Iframe Sandbox */
          <div
            className="w-full h-full origin-top-left transition-transform duration-200"
            style={{
              transform: `scale(${zoomLevel / 100})`,
              width: `${100 / (zoomLevel / 100)}%`,
              height: `${100 / (zoomLevel / 100)}%`,
            }}
          >
            <iframe
              key={`frame-${refreshKey}`}
              id="live-refresher-frame"
              src={displayUrl}
              title="Target Website Live Sandbox"
              className="w-full h-full border-0 bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              onError={() => setIframeError(true)}
            />
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs border border-zinc-200 px-3 py-1.5 rounded-xl shadow-md flex items-center gap-2 text-xs font-medium text-zinc-700 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
            <span>Refreshing website...</span>
          </div>
        )}
      </div>
    </div>
  );
};
