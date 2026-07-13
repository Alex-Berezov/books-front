'use client';

import { useState } from 'react';

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
    <div>
      <button onClick={handlePurge} disabled={state === 'loading'} type="button">
        {state === 'loading' ? 'Purging...' : 'Purge All Cache'}
      </button>
      {message && (
        <span
          style={{
            marginLeft: 8,
            fontSize: 13,
            color: state === 'success' ? '#16a34a' : '#dc2626',
          }}
        >
          {message}
        </span>
      )}
    </div>
  );
}
