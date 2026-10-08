// src/pages/Live.jsx
import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LiveCard from '../components/LiveCard';

export default function Live() {
  const LAB_URL = 'http://100.85.146.73:8080/?action=stream';
  const OUTDOOR_URL = 'http://100.85.146.73:8080/?action=stream';

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Camera Live Stream</h1>
      </header>

      <LiveCard title="SL2 Lab Room (Indoor)" initialSrc={LAB_URL} />
      <LiveCard title="Field Camera (Outdoor)" initialSrc={OUTDOOR_URL} />
    </div>
  );
}
