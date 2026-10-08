// src/components/AssistantPanel.jsx
import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiRobot2Fill,
  RiSendPlane2Fill,
  RiCloseLine,
  RiArrowLeftSLine,
  RiExchangeLine,
  RiErrorWarningLine,
} from 'react-icons/ri';

import axiosInstance from '../api';

const BRAND = '#FEDC00';
const PICK_H = 300;
const CHAT_H = 640;

/* ---------------- Typing (thinking) bubble ---------------- */
function TypingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      className="px-3 py-2 rounded-2xl text-sm bg-gray-100 text-gray-700 rounded-bl-md shadow-sm inline-flex items-center gap-1"
    >
      <span className="inline-flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-gray-400"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
            transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
          />
        ))}
      </span>
    </motion.div>
  );
}

/* ---------------- Table bubble (rows preview) ---------------- */
function TableBubble({ rows, sql }) {
  if (!rows || !rows.length) return null;
  const cols = Object.keys(rows[0] || {});

  const toCSV = () => {
    const head = cols.join(',');
    const body = rows.map((r) => cols.map((c) => JSON.stringify(r[c] ?? '')).join(',')).join('\n');
    const blob = new Blob([head + '\n' + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'detections.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="px-3 py-2 rounded-2xl text-sm bg-white border border-gray-200 text-gray-900 rounded-bl-md shadow-sm max-w-[92%]">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Results</div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-gray-600">
            {rows.length} rows
          </span>
          <button
            onClick={toCSV}
            className="text-xs px-2 py-1 rounded-md border border-gray-300 hover:bg-gray-50"
            title="Download CSV"
          >
            CSV
          </button>
        </div>
      </div>

      <div className="max-h-64 overflow-auto no-scrollbar rounded-md border border-gray-200">
        <table className="w-full text-xs text-left">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
            <tr>
              {cols.map((c) => (
                <th key={c} className="px-2 py-1 text-gray-600 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={i % 2 ? 'bg-white' : 'bg-gray-50'}>
                {cols.map((c) => (
                  <td key={c} className="px-2 py-1 text-gray-800 border-t border-gray-100">
                    {String(r[c] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sql ? (
        <details className="mt-2">
          <summary className="text-xs text-gray-500 cursor-pointer">SQL used</summary>
          <code className="block whitespace-pre-wrap break-words text-[11px] bg-gray-50 border border-gray-200 rounded-md p-2 mt-1">
            {sql}
          </code>
        </details>
      ) : null}
    </div>
  );
}

export default function AssistantPanel({ open, onClose, devices = ['2-birdnetpi-b687', '3-birdnetpi-b864'] }) {
  const [mode, setMode] = useState('pick'); // 'pick' | 'chat'
  const [selected, setSelected] = useState(null);
  const [msgs, setMsgs] = useState([]); // {role, text} | {role, type:'table', rows, sql} | {role, typing:true}
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState('');

  const listRef = useRef(null);

  const locationMapping = {
    '2-birdnetpi-b687': 'Party Area',
    '3-birdnetpi-b864': 'Outdoor Kitchen',
  };

  useEffect(() => {
    if (!open) {
      setMode('pick');
      setSelected(null);
      setMsgs([]);
      setInput('');
      setIsThinking(false);
      setError('');
    }
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, mode]);

  const subtitle = useMemo(
    () => (mode === 'pick' ? 'Choose a device to start chatting' : 'Let me help you analyze your bird data'),
    [mode]
  );

  const startChat = (dev) => {
    setSelected(dev);
    setMsgs([{ role: 'assistant', text: `Connected to ${dev}. What would you like to know?` }]);
    setMode('chat');
  };

  const switchDevice = () => {
    setMode('pick');
    setSelected(null);
    setMsgs([]);
    setInput('');
    setIsThinking(false);
    setError('');
  };

  const toHistory = (list) =>
    list
      .filter((m) => m.text) // 只把纯文本往后端传
      .map((m) => ({ role: m.role, content: m.text }));

  const send = async () => {
    const val = input.trim();
    if (!val || !selected || isThinking) return;

    setError('');
    setMsgs((m) => [...m, { role: 'user', text: val }, { role: 'assistant', typing: true }]);
    setInput('');
    setIsThinking(true);

    try {
      const { data } = await axiosInstance.post('ai/assistant/ask', {
        device: selected,
        question: val,
        history: toHistory(msgs),
      });

      // 替换 typing
      setMsgs((m) => {
        const copy = [...m];
        const idx = copy.findIndex((x) => x.typing);
        if (idx >= 0) copy.splice(idx, 1, { role: 'assistant', text: data?.answer ?? 'No answer.' });
        else copy.push({ role: 'assistant', text: data?.answer ?? 'No answer.' });

        // 如果有行集，追加一个表格气泡
        if (data?.rows && data.rows.length) {
          copy.push({ role: 'assistant', type: 'table', rows: data.rows, sql: data.sql });
        }
        return copy;
      });
    } catch (e) {
      setMsgs((m) => {
        const copy = m.filter((x) => !x.typing);
        copy.push({
          role: 'assistant',
          text: 'Error contacting assistant. Please try again.',
        });
        return copy;
      });
      setError(e?.response?.data?.detail || e?.message || 'Assistant error');
    } finally {
      setIsThinking(false);
    }
  };

  const targetH = mode === 'pick' ? PICK_H : CHAT_H;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed bottom-6 right-6 z-[60] w-[min(440px,calc(100vw-2rem))]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden"
            animate={{ height: targetH }}
            initial={{ height: PICK_H }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            style={{ willChange: 'height' }}
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl grid place-items-center" style={{ backgroundColor: BRAND }}>
                    <RiRobot2Fill className="text-black" />
                  </div>
                  <div className="leading-tight">
                    <div className="font-semibold text-gray-900">AI Assistant</div>
                    <div className="text-xs text-gray-500">{subtitle}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={onClose}
                    className="rounded-lg p-2 hover:bg-gray-100 active:scale-95 transition"
                    aria-label="Close assistant"
                  >
                    <RiCloseLine size={20} />
                  </button>
                </div>
              </div>

              {/* Body */}
              {mode === 'pick' ? (
                <div className="px-4 py-4 overflow-hidden">
                  <div className="text-sm text-gray-600 mb-3">Select one of your devices:</div>
                  <div className="grid grid-cols-1 gap-3">
                    {devices.map((dev) => (
                      <button
                        key={dev}
                        onClick={() => startChat(dev)}
                        className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold text-black"
                            style={{ backgroundColor: BRAND }}
                          >
                            {dev.split('-')[0]}
                          </span>
                          <div className="leading-tight">
                            <div className="font-medium text-gray-900">{dev}</div>
                            <div className="text-xs text-gray-500">{locationMapping[dev] || 'BirdNET-Pi node'}</div>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 group-hover:text-gray-700">Choose →</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* 当前设备条 */}
                  <div className="px-4 pt-3 shrink-0">
                    <div className="flex items-center justify-between rounded-xl bg-gray-100 border border-gray-200 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold text-black"
                          style={{ backgroundColor: BRAND }}
                        >
                          {selected?.split('-')[0]}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{selected}</span>
                      </div>
                      <button
                        onClick={switchDevice}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-700 border border-gray-300 hover:bg-white transition"
                      >
                        <RiArrowLeftSLine size={16} />
                        Change
                      </button>
                    </div>
                  </div>

                  {/* 消息列表 */}
                  <div ref={listRef} className="flex-1 px-4 py-3 space-y-3 overflow-y-auto no-scrollbar">
                    {msgs.map((m, i) => {
                      const isUser = m.role === 'user';
                      return (
                        <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                          {m.typing ? (
                            <TypingBubble />
                          ) : m.type === 'table' ? (
                            <TableBubble rows={m.rows} sql={m.sql} />
                          ) : (
                            <div
                              className={[
                                'px-3 py-2 rounded-2xl text-sm shadow-sm max-w-[82%]',
                                isUser
                                  ? 'bg-gray-900 text-white rounded-br-md'
                                  : 'bg-gray-100 text-gray-900 rounded-bl-md',
                              ].join(' ')}
                            >
                              {m.text}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {error ? (
                      <div className="flex justify-start">
                        <div className="px-3 py-2 rounded-2xl text-xs shadow-sm max-w-[82%] bg-red-50 border border-red-200 text-red-700 rounded-bl-md flex items-start gap-2">
                          <RiErrorWarningLine className="mt-0.5" />
                          <div>{error}</div>
                        </div>
                      </div>
                    ) : null}

                    {msgs.length === 0 && (
                      <div className="text-center text-sm text-gray-500 py-8">Say hi to get started.</div>
                    )}
                  </div>

                  {/* 输入区 */}
                  <div className="p-3 border-t border-gray-200 bg-white shrink-0">
                    <div className="flex items-center gap-2">
                      <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => (e.key === 'Enter' && !e.shiftKey ? (e.preventDefault(), send()) : null)}
                        placeholder="Show detections above 0.8 confidence in the last 24h"
                        className="flex-1 rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        disabled={isThinking}
                      />
                      <button
                        onClick={send}
                        disabled={isThinking || !input.trim()}
                        className="inline-flex items-center gap-1 rounded-xl px-3 py-2 font-medium text-black shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ backgroundColor: BRAND }}
                      >
                        <RiSendPlane2Fill />
                        Send
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
