import React, { useState } from 'react';
import { X, Check, Copy, Terminal, ExternalLink, ShieldCheck, Cpu, Globe, AlertCircle, RefreshCw } from 'lucide-react';

interface RailwayDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RailwayDeployModal: React.FC<RailwayDeployModalProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [testUrl, setTestUrl] = useState('');
  const [testResult, setTestResult] = useState<{ status: string; ok: boolean; latency?: number } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleTestUrl = async () => {
    if (!testUrl.trim()) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/ping?url=${encodeURIComponent(testUrl.trim())}`);
      const data = await res.json();
      setTestResult({
        ok: data.ok,
        status: `${data.status} ${data.statusText || ''}`,
        latency: data.latencyMs,
      });
    } catch {
      setTestResult({ ok: false, status: 'Connection error' });
    } finally {
      setIsTesting(false);
    }
  };

  const steps = [
    {
      title: '1. Push Code to GitHub',
      detail: 'Export this project or commit changes to GitHub. The repository includes Node 22 configs, a multi-stage Dockerfile, and an Express 5 production server.',
      code: 'git push origin main',
    },
    {
      title: '2. Generate Your Public Web URL in Railway',
      detail: 'In Railway dashboard: Click your Service → go to the "Settings" tab → scroll down to "Networking" → click "Generate Domain". Railway will create your https://*.up.railway.app web URL.',
      code: 'Railway Dashboard → Settings → Networking → "Generate Domain"',
    },
    {
      title: '3. Zero Config Needed for PORT',
      detail: 'Railway automatically injects the PORT environment variable. The bundled server binds to 0.0.0.0 and process.env.PORT automatically.',
      code: 'PORT: Dynamically assigned by Railway container',
    },
    {
      title: '4. Healthcheck Path',
      detail: 'Under Railway Settings → Networking → Healthcheck Path, set /api/health (or leave default):',
      code: '/api/health',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-zinc-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Railway Web URL & Deployment</h3>
              <p className="text-xs text-zinc-400">Generate public URL & ensure 24/7 continuous operation</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Key fix banner for Web URL */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">Why your Railway Web URL didn&apos;t work previously:</span>
              <ul className="list-disc list-inside space-y-1 text-amber-800 text-[11px]">
                <li><strong>No domain generated yet:</strong> Railway does not create a public URL until you click <em>&quot;Generate Domain&quot;</em> in Service Settings → Networking.</li>
                <li><strong>Node 18 vs Node 22 build error:</strong> The previous build crashed due to Node 18 missing <code className="bg-amber-100 px-1 py-0.5 rounded">styleText</code>. We added Node 22 engines, <code className="bg-amber-100 px-1 py-0.5 rounded">nixpacks.toml</code>, and a production <code className="bg-amber-100 px-1 py-0.5 rounded">Dockerfile</code> so it builds cleanly.</li>
                <li><strong>Dynamic Vite isolation:</strong> Vite is now strictly loaded in dev mode so the compiled production server runs instantly with zero runtime overhead.</li>
              </ul>
            </div>
          </div>

          <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p>
              This app includes an Express backend that automatically binds to <code className="bg-indigo-100 px-1 py-0.5 rounded font-mono font-semibold">0.0.0.0:PORT</code> and provides continuous keep-alive pinging.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div key={step.title} className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 text-xs">
                <div className="font-semibold text-zinc-900 mb-1">{step.title}</div>
                <p className="text-zinc-600 mb-2 leading-relaxed">{step.detail}</p>
                <div className="flex items-center justify-between bg-zinc-900 text-zinc-200 px-3 py-2 rounded-lg font-mono text-[11px]">
                  <span className="truncate mr-2">{step.code}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(step.code, idx)}
                    className="p-1 text-zinc-400 hover:text-white transition-colors shrink-0"
                    title="Copy snippet"
                  >
                    {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Test your railway web url helper */}
          <div className="bg-zinc-100/70 rounded-xl p-3.5 border border-zinc-200/80 text-xs space-y-2">
            <span className="font-semibold text-zinc-800 block text-xs">
              Test Any Railway Web URL
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://your-app.up.railway.app"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={handleTestUrl}
                disabled={isTesting || !testUrl.trim()}
                className="px-3 py-1.5 bg-zinc-900 text-white rounded-lg font-semibold hover:bg-zinc-800 disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0"
              >
                {isTesting ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Ping'}
              </button>
            </div>
            {testResult && (
              <div className={`p-2 rounded-lg text-[11px] font-mono flex items-center justify-between ${
                testResult.ok ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
              }`}>
                <span>Status: {testResult.status}</span>
                {testResult.latency !== undefined && <span>{testResult.latency}ms</span>}
              </div>
            )}
          </div>

          {/* Quick Technical Specs */}
          <div className="bg-zinc-100/70 rounded-xl p-3.5 border border-zinc-200/80 text-xs">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-zinc-400" />
              Production Configuration Checklist
            </div>
            <div className="grid grid-cols-2 gap-2 text-zinc-700">
              <div>
                <span className="text-zinc-400 block text-[10px]">Node Version:</span>
                <code className="font-mono text-[11px] font-semibold text-emerald-600">Node 22 (LTS)</code>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">Builder:</span>
                <code className="font-mono text-[11px] font-semibold">Nixpacks or Dockerfile</code>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">Build Command:</span>
                <code className="font-mono text-[11px] font-semibold">npm run build</code>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">Start Command:</span>
                <code className="font-mono text-[11px] font-semibold">npm start</code>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">Container Port:</span>
                <code className="font-mono text-[11px] font-semibold">0.0.0.0:$PORT</code>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">Healthcheck:</span>
                <code className="font-mono text-[11px] font-semibold">/api/health</code>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between">
          <a
            href="https://railway.app/dashboard"
            target="_blank"
            rel="noreferrer noopener"
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
          >
            <span>Open Railway Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
