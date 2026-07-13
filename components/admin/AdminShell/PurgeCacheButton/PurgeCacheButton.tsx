'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import styles from './PurgeCacheButton.module.scss';

export function PurgeCacheButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handlePurge = async () => {
    setState('loading');
    setMessage('');
    try {
      const res = await fetch('/api/admin/purge-cache', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setState('success');
        setMessage(`Purged ${data.revalidated} paths`);
      } else {
        setState('error');
        setMessage(data.error || 'Unknown error');
      }
    } catch {
      setState('error');
      setMessage('Network error');
    }

    setTimeout(() => {
      setState('idle');
      setMessage('');
    }, 4000);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <button
        onClick={handlePurge}
        disabled={state === 'loading'}
        type="button"
        className={styles.button}
      >
        <RefreshCw size={16} className={state === 'loading' ? styles.spinning : undefined} />
        {state === 'loading' ? 'Purging...' : 'Purge All Cache'}
      </button>
      {message && <span className={`${styles.message} ${styles[state]}`}>{message}</span>}
    </div>
  );
}
