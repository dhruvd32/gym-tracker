import React, { useEffect, useState } from 'react';
import { LogScreen } from './components/LogScreen.jsx';
import { HeatmapScreen } from './components/HeatmapScreen.jsx';
import { HistoryScreen } from './components/HistoryScreen.jsx';
import { flushSyncQueue, installSyncTriggers, onSyncStateChange } from './data/sync.js';

export default function App() {
  const [tab, setTab] = useState('log'); // 'log' | 'heat' | 'history'
  const [toast, setToast] = useState(null);
  const [syncState, setSyncState] = useState({ status: 'idle', pending: 0 });

  useEffect(() => {
    installSyncTriggers();
    flushSyncQueue();
    const off = onSyncStateChange((s) => setSyncState(s));
    return () => off();
  }, []);

  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 1600);
  }

  const syncLabel =
    syncState.status === 'idle' ? 'Synced' :
    syncState.status === 'syncing' ? 'Syncing…' :
    syncState.status === 'pending' ? `${syncState.pending || 0} pending` :
    syncState.status === 'offline' ? 'Offline' : 'Idle';

  let screen;
  if      (tab === 'log')     screen = <LogScreen     showToast={showToast} />;
  else if (tab === 'heat')    screen = <HeatmapScreen />;
  else                        screen = <HistoryScreen showToast={showToast} />;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          gym<span className="dot">.</span>ledger
        </div>
        <span className={`sync-chip status-${syncState.status}`}>
          <span className="dot" /> {syncLabel}
        </span>
      </header>

      {screen}

      <nav className="tabbar">
        <button
          className={tab === 'log' ? 'active' : ''}
          onClick={() => setTab('log')}
        >
          <span className="mark">01</span>
          Log
        </button>
        <button
          className={tab === 'heat' ? 'active' : ''}
          onClick={() => setTab('heat')}
        >
          <span className="mark">02</span>
          Heatmap
        </button>
        <button
          className={tab === 'history' ? 'active' : ''}
          onClick={() => setTab('history')}
        >
          <span className="mark">03</span>
          History
        </button>
      </nav>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
