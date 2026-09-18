import React, { useState } from 'react';
import { X, Check, Copy, Terminal, ExternalLink, ShieldCheck, Cpu, ArrowRight } from 'lucide-react';

interface RailwayDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RailwayDeployModal: React.FC<RailwayDeployModalProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const steps = [
    {
      title: '1. Push or Export Code to GitHub',
      detail: 'Export this project or push to a GitHub repository. Railway integrates directly with GitHub for automated continuous deployments.',
      code: 'git push origin main',
    },
    {
      title: '2. Create Project in Railway',
      detail: 'Log into railway.app, click "+ New Project" → select "Deploy from GitHub repo", and choose this repository.',
      code: 'railway link (optional via CLI)',
    },
    {
      title: '3. Zero Configuration Required',
      detail: 'The package.json scripts are already pre-configured for Railway production. Railway automatically runs npm run build and npm start.',
      code: 'PORT: Dynamically assigned by Railway container',
    },
    {
      title: '4. Healthcheck Path',
      detail: 'Under Railway Settings → Networking → Healthcheck Path, set:',
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
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Railway Deployment Guide</h3>
              <p className="text-xs text-zinc-400">How to deploy and run this refresher 24/7 on Railway</p>
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
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-3.5 text-xs text-indigo-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p>
              This app includes a native Express + Vite server bundle that automatically listens to Railway&apos;s assigned <code className="bg-indigo-100 px-1 py-0.5 rounded font-mono font-semibold">PORT</code>. It runs continuously in the cloud to keep any target website alive!
            </p>
          </div>

          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div key={step.title} className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 text-xs">
                <div className="font-semibold text-zinc-900 mb-1">{step.title}</div>
                <p className="text-zinc-600 mb-2 leading-relaxed">{step.detail}</p>
                <div className="flex items-center justify-between bg-zinc-900 text-zinc-200 px-3 py-2 rounded-lg font-mono text-[11px]">
                  <span>{step.code}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(step.code, idx)}
                    className="p-1 text-zinc-400 hover:text-white transition-colors"
                    title="Copy snippet"
                  >
                    {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Technical Specs */}
          <div className="bg-zinc-100/70 rounded-xl p-3.5 border border-zinc-200/80 text-xs">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-zinc-400" />
              Railway Production Build Profile
            </div>
            <div className="grid grid-cols-2 gap-2 text-zinc-700">
              <div>
                <span className="text-zinc-400 block text-[10px]">Node Version:</span>
                <code className="font-mono text-[11px] font-semibold text-emerald-600">Node 22 (LTS)</code>
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
                <code className="font-mono text-[11px] font-semibold">process.env.PORT</code>
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
            href="https://railway.app"
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
            Got it, Let&apos;s Refresh!
          </button>
        </div>
      </div>
    </div>
  );
};
