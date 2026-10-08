import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import animationData from '../assets/loading.json';

export default function Loader({ fullscreen = false }) {
  const msgs = ['Chirp!', 'Tweet!', 'Whistle~', 'Trill♪', 'Cheep', 'Peep!'];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % msgs.length), 1800);
    return () => clearInterval(t);
  }, []);

  const containerClass = fullscreen
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100'
    : 'flex items-center justify-center py-10';

  return (
    <div className={containerClass}>
      <div className="relative">
        <div className="absolute inset-0 -z-10 rounded-2xl pointer-events-none">
          <div className="absolute inset-0 rounded-2xl ring-1 ring-yellow-400/20" />
          <div className="absolute inset-0 rounded-2xl shadow-[0_0_90px_20px_rgba(250,204,21,0.18)]" />
        </div>

        <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5 bg-white">
          <Lottie
            animationData={animationData}
            loop
            className="w-[12rem] h-[12rem] md:w-[15rem] md:h-[15rem]"
            rendererSettings={{ preserveAspectRatio: 'xMidYMid meet', clearCanvas: true, progressiveLoad: true }}
            style={{ background: 'transparent', pointerEvents: 'none' }}
          />

          <div
            className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2
                       px-4 py-2 rounded-2xl bg-gray-900/80 text-white
                       text-sm font-semibold text-center backdrop-blur-md shadow-lg
                       min-w-[7.5rem] text-nowrap"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={idx}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="inline-block align-middle"
              >
                {msgs[idx]}
              </motion.span>
            </AnimatePresence>

            <div className="flex justify-center mt-1 gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white/90 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce [animation-delay:120ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce [animation-delay:240ms]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
