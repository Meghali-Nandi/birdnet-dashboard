import React from 'react';
import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function LiveCard({ title, initialSrc }) {
  const [src, setSrc] = useState(initialSrc);
  const [status, setStatus] = useState('connecting');
  const [retries, setRetries] = useState(0);
  const imgRef = useRef(null);
  const retryRef = useRef(null);

  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const handleLoad = () => setStatus('ok');
    const handleError = () => {
      setStatus('retrying');
      clearTimeout(retryRef.current);
      retryRef.current = setTimeout(() => {
        setRetries((r) => r + 1);
        setSrc((s) => s.split('&_t=')[0] + `&_t=${Date.now()}`);
      }, Math.min(1000 * Math.pow(2, retries), 8000));
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);
    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
      clearTimeout(retryRef.current);
    };
  }, [retries]);

  const badge = useMemo(() => {
    const map = {
      ok: { wrap: 'bg-green-100 text-green-700', dot: 'bg-green-500', text: 'live' },
      retrying: { wrap: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', text: 'retrying' },
      paused: { wrap: 'bg-slate-200 text-slate-700', dot: 'bg-slate-400', text: 'paused' },
      connecting: { wrap: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400', text: 'connecting' },
    };
    const b = map[status] ?? map.connecting;
    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${b.wrap}`}>
        <span className={`w-2 h-2 rounded-full ${b.dot}`} />
        {b.text}
      </span>
    );
  }, [status]);

  const filterStyle = {
    filter: `brightness(${brightness}%) contrast(${contrast}%)`,
  };

  const reconnect = () => {
    setStatus('connecting');
    setRetries(0);
    setSrc((s) => s.split('&_t=')[0] + `&_t=${Date.now()}`);
  };

  const pauseOrResume = () => {
    if (status === 'paused') {
      setStatus('connecting');
      setSrc((s) => s.split('&_t=')[0] + `&_t=${Date.now()}`);
    } else {
      setStatus('paused');
      imgRef.current.src = '';
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg text-white font-semibold">{title}</h2>
        <div className="flex items-center gap-3">
          {badge}
          <span className="text-xs text-slate-500">retries: {retries}</span>
        </div>
      </div>

      {/* Video */}
      <div className="mt-4 relative aspect-video overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
        <AnimatePresence>
          {status !== 'ok' && status !== 'paused' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex items-center justify-center"
            >
              <div className="h-12 w-12 rounded-full border-4 border-slate-300 border-t-transparent animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>
        <img
          ref={imgRef}
          src={status === 'paused' ? '' : src}
          alt={`${title} - MJPEG stream`}
          className={`h-full w-full select-none`}
          style={filterStyle}
          draggable={false}
        />
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
        <button className="px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700">Fullscreen</button>
        <button className="px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-500">Snapshot</button>
        <button
          onClick={pauseOrResume}
          className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-500 hover:bg-slate-300 dark:hover:bg-slate-600"
        >
          {status === 'paused' ? 'Resume' : 'Pause'}
        </button>

        <button
          onClick={reconnect}
          className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-500 hover:bg-slate-300 dark:hover:bg-slate-600"
        >
          Reconnect
        </button>

        <div className="h-6 w-px bg-slate-300/70 dark:bg-slate-600 mx-1" />

        <div className="flex items-center gap-2 text-sm">
          <span className="w-12 text-right text-slate-500">Bright</span>
          <input
            type="range"
            min={50}
            max={150}
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            className="accent-[#FDDC00]"
          />
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="w-12 text-right text-slate-500">Contrast</span>
          <input
            type="range"
            min={50}
            max={150}
            value={contrast}
            onChange={(e) => setContrast(Number(e.target.value))}
            className="accent-[#FDDC00]"
          />
        </div>
      </div>
    </div>
  );
}

export default LiveCard;
