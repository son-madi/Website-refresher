import React, { useState } from 'react';
import { Globe, Zap, Layers, Server, Shield, Check, History, ExternalLink } from 'lucide-react';
import { RefreshConfig, RefreshMode } from '../types';

interface UrlInputBarProps {
  config: RefreshConfig;
  onChangeConfig: (newConfig: Partial<RefreshConfig>) => void;
  onInstantRefresh: () => void;
  isRunning: boolean;
  recentUrls: string[];
  onSelectRecentUrl: (url: string) => void;
}

const SAMPLE_URLS = [
  { label: 'Example Domain', url: 'https://example.com' },
  { label: 'HTTPBin Status', url: 'https://httpbin.org/get' },
  { label: 'Wikipedia Random', url: 'https://en.wikipedia.org/wiki/Special:Random' },
  { label: 'Cloudflare Trace', url: 'https://1.1.1.1/cdn-cgi/trace' },
];

export const UrlInputBar: React.FC<UrlInputBarProps> = ({
  config,
  onChangeConfig,
  onInstantRefresh,
  isRunning,
  recentUrls,
  onSelectRecentUrl,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [inputValue, setInputValue] = useState(config.url);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChangeConfig({ url: val });
  };

  const handleBlurOrSubmit = () => {
    let cleanUrl = inputValue.trim();
    if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
      setInputValue(cleanUrl);
      onChangeConfig({ url: cleanUrl });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 sm:p-5 transition-all">
      {/* Top row: Label & mode badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <label htmlFor="target-website-input" className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-indigo-600" />
          Target Website URL
        </label>

        {/* Mode Selector */}
        <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200/80 text-xs">
          <button
            id="mode-dual-btn"
            type="button"
            onClick={() => onChangeConfig({ refreshMode: 'dual' })}
            className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
              config.refreshMode === 'dual'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
            title="Reloads live preview and pings server status simultaneously"
          >
            <Layers className="w-3 h-3 text-indigo-500" />
            <span>Dual Mode</span>
          </button>
          <button
            id="mode-iframe-btn"
            type="button"
            onClick={() => onChangeConfig({ refreshMode: 'iframe' })}
            className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
              config.refreshMode === 'iframe'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
            title="Reloads the visual embedded frame"
          >
            <Zap className="w-3 h-3 text-emerald-500" />
            <span>Live Frame</span>
          </button>
          <button
            id="mode-ping-btn"
            type="button"
            onClick={() => onChangeConfig({ refreshMode: 'ping' })}
            className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
              config.refreshMode === 'ping'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
            title="Background HTTP keep-alive pings (saves bandwidth, bypasses iframe blockers)"
          >
            <Server className="w-3 h-3 text-violet-500" />
            <span>Server Keep-Alive</span>
          </button>
        </div>
      </div>

      {/* URL Input Bar Field */}
      <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <Globe className="w-4 h-4" />
          </div>
          <input
            id="target-website-input"
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlurOrSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleBlurOrSubmit();
                onInstantRefresh();
              }
            }}
            placeholder="e.g. https://my-railway-app.up.railway.app or example.com"
            className="w-full pl-10 pr-24 py-2.5 text-sm bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-200 focus:border-indigo-500 rounded-xl outline-hidden transition-all text-zinc-900 placeholder:text-zinc-400 font-mono"
          />

          {/* Right helper buttons inside input */}
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
            {config.url && (
              <a
                href={config.url}
                target="_blank"
                rel="noreferrer noopener"
                className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 rounded-md transition-colors"
                title="Open directly in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            {recentUrls.length > 0 && (
              <button
                id="url-history-toggle-btn"
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className={`p-1.5 rounded-md transition-colors ${
                  showHistory ? 'bg-indigo-100 text-indigo-700' : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60'
                }`}
                title="Recent URLs"
              >
                <History className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Cache-buster toggle & Test Ping button */}
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <button
            id="cache-buster-toggle-btn"
            type="button"
            onClick={() => onChangeConfig({ useCacheBuster: !config.useCacheBuster })}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium border transition-colors ${
              config.useCacheBuster
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
            }`}
            title="Adds ?_t=timestamp query parameter to bypass HTTP caching mechanisms"
          >
            <Shield className={`w-3.5 h-3.5 ${config.useCacheBuster ? 'text-indigo-600' : 'text-zinc-400'}`} />
            <span>Cache Buster</span>
            {config.useCacheBuster && <Check className="w-3 h-3 text-indigo-600" />}
          </button>

          <button
            id="instant-refresh-btn"
            type="button"
            onClick={onInstantRefresh}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 transition-colors shadow-xs"
          >
            <span>Refresh Now</span>
          </button>
        </div>
      </div>

      {/* Recent URLs dropdown */}
      {showHistory && recentUrls.length > 0 && (
        <div className="mt-3 p-2 bg-zinc-50 rounded-xl border border-zinc-200">
          <div className="text-[11px] font-semibold text-zinc-400 px-2 py-1 uppercase tracking-wider">
            Recently Visited Sites
          </div>
          <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
            {recentUrls.map((recent) => (
              <button
                key={recent}
                type="button"
                onClick={() => {
                  setInputValue(recent);
                  onSelectRecentUrl(recent);
                  setShowHistory(false);
                }}
                className="text-left px-2 py-1.5 rounded-lg text-xs font-mono text-zinc-700 hover:bg-white hover:text-indigo-600 truncate transition-colors flex items-center justify-between"
              >
                <span>{recent}</span>
                <span className="text-[10px] text-zinc-400">select</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Sample Presets */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-zinc-400 font-medium">Sample sites:</span>
        {SAMPLE_URLS.map((sample) => (
          <button
            key={sample.url}
            type="button"
            onClick={() => {
              setInputValue(sample.url);
              onChangeConfig({ url: sample.url });
              onSelectRecentUrl(sample.url);
            }}
            className="px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 text-[11px] font-medium transition-colors"
          >
            {sample.label}
          </button>
        ))}
      </div>
    </div>
  );
};
