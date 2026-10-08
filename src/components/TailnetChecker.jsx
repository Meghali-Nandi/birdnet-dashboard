import React, { useEffect, useState } from 'react';
import axiosInstance from '../api';
import { BACKEND_URL } from '../api';

const TailnetChecker = () => {
  const [status, setStatus] = useState('checking'); // 'checking' | 'connected' | 'not_connected'
  const [info, setInfo] = useState(null);

  useEffect(() => {
    console.log(BACKEND_URL);
    fetch(`${BACKEND_URL}auth/tailscale_check`, { signal: AbortSignal.timeout(3000) })
      .then((res) => res.json())
      .then((data) => {
        setStatus('connected');
        setInfo(data);
      })
      .catch((error) => {
        console.error('Error fetching Tailnet info:', error);
        console.error('Error connecting to Tailnet device');
        setStatus('not_connected');
      });
  }, []);

  if (status === 'checking') {
    return <p>🔍 Checking TailScale connection...</p>;
  }

  if (status === 'connected') {
    return (
      <div>
        <span className="bg-green-200 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-green-300 dark:text-green-900">
          Tailnet Connected
        </span>
        <p className="mt-2">
          Current Device is reachable at <strong className="text-[#FEDC00]">{info?.ip_address}</strong>
        </p>
      </div>
    );
  }

  return (
    <div>
      <span className="bg-red-200 text-red-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-red-300 dark:text-red-900">
        Not in Tailnet
      </span>
      <p className="mt-2">
        Your current device is <strong>not connected</strong> to the TailScale network. Please ensure Tailscale is
        installed and active.
      </p>
      <a
        href="https://tailscale.com/download"
        target="_blank"
        rel="noopener noreferrer"
        className="underline mt-1 inline-block"
      >
        Install Tailscale
      </a>
    </div>
  );
};

export default TailnetChecker;
