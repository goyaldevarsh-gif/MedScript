import React from 'react';
import { exportAll } from '../lib/db';
import { download } from '../lib/util';

/** If a screen crashes, show a calm page instead of a blank one. Saved data is not touched. */
export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { err: Error | null; saved: boolean }> {
  state = { err: null as Error | null, saved: false };
  static getDerivedStateFromError(err: Error) { return { err }; }
  componentDidCatch(err: Error) { console.error('MedScript crashed:', err); }
  async backup() {
    try { const data = await exportAll(); download(new Blob([JSON.stringify(data)], { type: 'application/json' }), `MedScript_backup_${new Date().toISOString().slice(0, 10)}.json`); this.setState({ saved: true }); } catch { /* ignore */ }
  }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="flex min-h-full items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 text-center shadow-lg">
          <div className="text-xl font-extrabold text-slate-900">Something went wrong on this screen</div>
          <p className="text-sm text-slate-600">Your patients and prescriptions are safe on this device. Drafts are saved as you type.</p>
          <div className="flex flex-col gap-2">
            <button className="rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white" onClick={() => { window.location.hash = '#/'; window.location.reload(); }}>Reload the app</button>
            <button className="rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-800" onClick={() => this.backup()}>{this.state.saved ? 'Backup downloaded' : 'Download a backup first'}</button>
          </div>
          <p className="break-words text-[11px] text-slate-400">{this.state.err.message}</p>
        </div>
      </div>
    );
  }
}
