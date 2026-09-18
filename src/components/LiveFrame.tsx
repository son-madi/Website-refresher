import React, { useState, useRef, useEffect } from 'react';
import {
  ExternalLink,
  RefreshCw,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  ShieldAlert,
  CheckCircle,
  Smartphone,
  Tablet,
  Monitor,
  RotateCcw,
} from 'lucide-react';
import { PingResult } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface LiveFrameProps {
  url: string;
  refreshKey: number;
  isLoading: boolean;
  onManualRefresh: () => void;
  lastPing: PingResult | null;
  mode: 'dual' | 'iframe' | 'ping';
}

type DeviceView = 'full' | 'tablet' | 'mobile';

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
  const [deviceView, setDeviceView] = useState<DeviceView>('full');
  const containerRef = useRef<HTMLDivElement>(null);

  const cleanUrl = url.trim();
  const normalizedUrl = cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('about:')
    ? `https://${cleanUrl}`
    : cleanUrl;
  const displayUrl = normalizedUrl || 'about:blank';
  const blocksIframe = lastPing?.blocksIframe || iframeError;

  useEffect(() => {
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

  const getDeviceFrameStyles = () => {
    if (deviceView === 'mobile') {
      return 'w-full max-w-[375px] h-[96%] rounded-2xl border-2 border-zinc-700/80 shadow-2xl shadow-black/60 overflow-hidden relative my-auto';
    }
    if (deviceView === 'tablet') {
      return 'w-full max-w-[768px] h-[96%] rounded-xl border border-zinc-700/80 shadow-2xl shadow-black/60 overflow-hidden relative my-auto';
    }
    return 'w-full h-full relative overflow-hidden';
  };

  return (
    <div
      ref={containerRef}
      className={`bg-zinc-900/90 rounded-2xl border border-zinc-800 shadow-xl shadow-black/20 overflow-hidden flex flex-col transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none h-screen w-screen'
          : 'h-[480px] sm:h-[560px] lg:h-[620px] max-h-[82vh] w-full'
      }`}
    >
      {/* Browser Chrome Header - Responsive and No Horizontal Overflow */}
      <div className="bg-zinc-950/90 border-b border-zinc-800 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 shrink-0 overflow-hidden">
        {/* Left: Window controls and Status indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>

          <span className="hidden xl:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-zinc-800/80 text-zinc-300 border border-zinc-700/50">
            <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-indigo-400 animate-ping' : 'bg-emerald-400'}`} />
            <span>{isLoading ? 'Refreshing' : 'Live'}</span>
          </span>
        </div>

        {/* Device View Mode Switcher - Compact */}
        <div className="hidden md:flex items-center bg-zinc-900 p-0.5 rounded-lg text-xs border border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={() => setDeviceView('full')}
            className={`px-2 py-1 rounded-md font-medium flex items-center gap-1 transition-colors ${
              deviceView === 'full' ? 'bg-zinc-800 text-zinc-100 shadow-xs font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Desktop view (100% width)"
          >
            <Monitor className="w-3 h-3" />
            <span className="text-[11px]">Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setDeviceView('tablet')}
            className={`px-2 py-1 rounded-md font-medium flex items-center gap-1 transition-colors ${
              deviceView === 'tablet' ? 'bg-zinc-800 text-zinc-100 shadow-xs font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Tablet view (768px)"
          >
            <Tablet className="w-3 h-3" />
            <span className="text-[11px]">Tablet</span>
          </button>
          <button
            type="button"
            onClick={() => setDeviceView('mobile')}
            className={`px-2 py-1 rounded-md font-medium flex items-center gap-1 transition-colors ${
              deviceView === 'mobile' ? 'bg-zinc-800 text-zinc-100 shadow-xs font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Mobile view (375px)"
          >
            <Smartphone className="w-3 h-3" />
            <span className="text-[11px]">Mobile</span>
          </button>
        </div>

        {/* Address bar - truncated cleanly to avoid off-screen pushing */}
        <div className="flex-1 min-w-0 max-w-sm lg:max-w-md mx-1 sm:mx-2 flex items-center bg-zinc-900 border border-zinc-800 rounded-lg px-2 sm:px-3 py-1 text-xs text-zinc-300 font-mono shadow-xs overflow-hidden">
          <span className="text-zinc-500 mr-1.5 text-[11px] shrink-0">🔒</span>
          <span className="truncate flex-1 min-w-0" title={url || 'No URL configured'}>
            {url || 'No URL configured'}
          </span>
          {isLoading && (
            <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin ml-1.5 shrink-0" />
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-0.5 sm:gap-1 text-zinc-400 shrink-0">
          <div className="hidden sm:flex items-center">
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.max(50, prev - 25))}
              className="p-1 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(100)}
              className="text-[10px] font-mono px-1 py-0.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
              title="Reset Zoom to 100%"
            >
              {zoomLevel}%
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.min(150, prev + 25))}
              className="p-1 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="hidden sm:block h-3.5 w-px bg-zinc-800 mx-0.5" />

          <button
            type="button"
            onClick={onManualRefresh}
            className="p-1 sm:p-1.5 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
            title="Reload Preview Frame"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              className="p-1 sm:p-1.5 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
              title="Open Target in New Tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1 sm:p-1.5 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Frame Sandbox or Fallback */}
      <div className="relative flex-1 bg-zinc-950 overflow-hidden flex items-center justify-center p-1 sm:p-2">
        {!cleanUrl ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-500">
            <RefreshCw className="w-10 h-10 mb-3 text-zinc-700" />
            <h3 className="text-sm font-bold text-zinc-300 mb-1">Target Website Not Set</h3>
            <p className="text-xs max-w-sm text-zinc-500">
              Enter a website URL above to preview and auto-refresh in real time.
            </p>
          </div>
        ) : mode === 'ping' ? (
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-md bg-zinc-900 rounded-2xl border border-zinc-800 shadow-xl m-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/20 text-violet-400 border border-violet-500/30 flex items-center justify-center mb-3">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-100 mb-1">Server Keep-Alive Mode</h3>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              HTTP requests are dispatched directly from the server to keep{' '}
              <code className="bg-zinc-950 px-1 py-0.5 rounded text-zinc-200 border border-zinc-800">{url}</code> warm and responsive with zero client overhead.
            </p>
            <a
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/60 transition-colors shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Website in New Tab</span>
            </a>
          </div>
        ) : blocksIframe ? (
          <div className="flex flex-col items-center justify-center p-6 text-center bg-zinc-900 rounded-2xl border border-zinc-800 shadow-xl max-w-lg m-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-100 mb-1">Target Disallows Iframe Embedding</h3>
            <p className="text-xs text-zinc-400 max-w-md mb-3 leading-relaxed">
              <strong className="text-zinc-200">{url}</strong> delivers security headers (
              <code className="text-zinc-300">X-Frame-Options: {lastPing?.xFrameOptions || 'DENY'}</code> or CSP) preventing browser frames.
            </p>
            <div className="bg-emerald-950/40 border border-emerald-800/50 text-emerald-200 rounded-xl p-3 text-xs w-full mb-4 text-left">
              <div className="font-bold flex items-center gap-1.5 mb-1 text-emerald-300">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Auto-Refresh & Keep-Alive Are Fully Operational</span>
              </div>
              <p className="text-emerald-300/90 text-[11px] leading-relaxed">
                {url.toLowerCase().includes('railway.app')
                  ? 'Your Railway web app is being pinged via HTTP to prevent container sleep and keep cold-start latency low. The background runner keeps it alive 24/7.'
                  : 'The background HTTP pinger is keeping this site warm on your configured schedule. Refreshes continue running uninterrupted.'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in New Window</span>
              </a>
              <button
                type="button"
                onClick={() => setIframeError(false)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:bg-zinc-800 border border-zinc-700 transition-colors"
              >
                Retry Embedding
              </button>
            </div>
          </div>
        ) : (
          <div className={`transition-all duration-200 flex items-center justify-center ${getDeviceFrameStyles()}`}>
            {/* Centered canvas with transform origin center */}
            <div
              className="w-full h-full bg-white transition-transform duration-200 overflow-hidden flex flex-col"
              style={{
                transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : 'none',
                transformOrigin: 'top center',
                width: zoomLevel !== 100 ? `${(100 / (zoomLevel / 100))}%` : '100%',
                height: zoomLevel !== 100 ? `${(100 / (zoomLevel / 100))}%` : '100%',
              }}
            >
              <iframe
                key={`frame-${refreshKey}`}
                id="live-refresher-frame"
                src={displayUrl}
                title="Target Website Live Sandbox"
                className="w-full h-full border-0 bg-white block flex-1"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                onError={() => setIframeError(true)}
              />
            </div>
          </div>
        )}

        {/* Loading Flash Animation Overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-indigo-950/30 backdrop-blur-[1px] pointer-events-none flex items-center justify-center z-20"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-zinc-900/95 px-4 py-2 rounded-2xl shadow-xl border border-indigo-500/40 flex items-center gap-2.5 text-xs font-bold text-indigo-300"
              >
                <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                <span>Refreshing Target Website...</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

