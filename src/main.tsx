import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import Layout from './components/Layout';
import { ToastProvider } from './components/ui';
import Dashboard from './pages/Dashboard';
import Builder from './pages/Builder';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import Templates from './pages/Templates';
import SettingsPage from './pages/Settings';
import Desk from './pages/Desk';
import { seedIfNeeded } from './lib/db';
import { initUpdates } from './lib/pwa';
import ErrorBoundary from './components/ErrorBoundary';

initUpdates();
try { navigator.storage?.persist?.(); } catch { /* ignore */ }

function Boot() {
  const [ready, setReady] = React.useState(false);
  // the reception desk screen holds no MedScript data, so it does not set up the library
  React.useEffect(() => { if (window.location.hash.startsWith('#/desk')) { setReady(true); return; } seedIfNeeded().finally(() => setReady(true)); }, []);
  if (!ready) return <div className="flex h-full items-center justify-center text-slate-500">Loading MedScript…</div>;
  return (
    <HashRouter>
      <Routes>
        <Route path="desk" element={<Desk />} />
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="new" element={<Builder />} />
          <Route path="rx/:id" element={<Builder />} />
          <Route path="patients" element={<Patients />} />
          <Route path="patients/:id" element={<PatientDetail />} />
          <Route path="templates" element={<Templates />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ErrorBoundary><ToastProvider><Boot /></ToastProvider></ErrorBoundary></React.StrictMode>
);
