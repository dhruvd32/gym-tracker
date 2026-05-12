import React, { useEffect, useRef, useState } from 'react';
import { auth, signOut, onAuthStateChanged, getRedirectResult } from './data/firebase.js';
import { AuthScreen } from './components/AuthScreen.jsx';
import { LogScreen } from './components/LogScreen.jsx';
import { HeatmapScreen } from './components/HeatmapScreen.jsx';
import { HistoryScreen } from './components/HistoryScreen.jsx';
import { flushSyncQueue, installSyncTriggers, onSyncStateChange, pullFromFirestore } from './data/sync.js';

export default function App() {
  // undefined = checking auth, null = signed out, object = signed in
  const [user, setUser] = useState(undefined);
  const [tab, setTab] = useState('log');
  const [toast, setToast] = useState(null);
  const [syncState, setSyncState] = useState({ status: 'idle', pending: 0 });
  const triggersInstalled = useRef(false);

  // Auth state — runs once on mount
  useEffect(() => {
    // Handle the redirect result from Google OAuth (no-op if no pending redirect).
    getRedirectResult(auth).catch((err) => console.error('Auth redirect error:', err));

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    return () => unsubscribe();
  }, []);

  // Data sync — runs whenever the signed-in user changes
  useEffect(() => {
    if (!user) return;

    const off = onSyncStateChange((s) => setSyncState(s));

    if (!triggersInstalled.current) {
      installSyncTriggers();
      triggersInstalled.current = true;
    }

    pullFromFirestore()
      .then(() => flushSyncQueue())
      .catch(console.error);

    return () => off();
  }, [user?.uid]);

  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 1600);
  }

  // Loading
  if (user === undefined) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="muted" style={{ letterSpacing: '0.12em', fontSize: 12, textTransform: 'uppercase' }}>
          Loading…
        </span>
      </div>
    );
  }

  // Not authenticated
  if (!user) return <AuthScreen />;

  const syncLabel =
    syncState.status === 'idle'    ? 'Synced'                           :
    syncState.status === 'syncing' ? 'Syncing…'                         :
    syncState.status === 'pending' ? `${syncState.pending || 0} pending` :
    syncState.status === 'offline' ? 'Offline'                          : 'Idle';

  let screen;
  if      (tab === 'log')  screen = <LogScreen     showToast={showToast} />;
  else if (tab === 'heat') screen = <HeatmapScreen />;
  else                     screen = <HistoryScreen  showToast={showToast} />;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          gym<span className="dot">.</span>ledger
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={`sync-chip status-${syncState.status}`}>
            <span className="dot" /> {syncLabel}
          </span>
          <button
            className="mini-btn"
            onClick={signOut}
            title="Sign out"
            style={{ fontSize: 11, padding: '3px 8px' }}
          >
            Sign out
          </button>
        </div>
      </header>

      {screen}

      <nav className="tabbar">
        <button className={tab === 'log'     ? 'active' : ''} onClick={() => setTab('log')}>
          <span className="mark">01</span>Log
        </button>
        <button className={tab === 'heat'    ? 'active' : ''} onClick={() => setTab('heat')}>
          <span className="mark">02</span>Heatmap
        </button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
          <span className="mark">03</span>History
        </button>
      </nav>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
