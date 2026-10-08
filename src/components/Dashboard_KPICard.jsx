// src/components/StatCard.jsx
import React, { useMemo } from 'react';

/* ===== theme ===== */
const ACCENTS = {
  blue: { stroke: '#2563eb', ring: 'ring-blue-200' },
  green: { stroke: '#16a34a', ring: 'ring-green-200' },
  violet: { stroke: '#7c3aed', ring: 'ring-violet-200' },
  amber: { stroke: '#f59e0b', ring: 'ring-amber-200' },
  rose: { stroke: '#e11d48', ring: 'ring-rose-200' },
};
const GOOD_BAD = (good) =>
  good ? { bg: 'bg-green-100', text: 'text-green-700' } : { bg: 'bg-red-100', text: 'text-red-700' };

/* ===== parts ===== */
function DeltaBadge({ delta = 0, invert = false, base = 'vs yesterday' }) {
  let good = invert ? delta < 0 : delta > 0;
  if (delta === 0) good = true;
  const { bg, text } = GOOD_BAD(good);
  const sign = delta > 0 ? '+' : '';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${bg} ${text}`}>
      <span className="font-medium">
        {sign}
        {delta.toFixed(1)}
      </span>
      <span className="opacity-70">{base}</span>
    </span>
  );
}

function Sparkline({ data = [], color = '#2563eb', height = 24, target }) {
  // 域包含 target，保证 SLA 虚线在正确相对高度
  const { d, lastY, tY } = useMemo(() => {
    if (!data.length) return { d: '', lastY: 50, tY: undefined };
    const min = Math.min(...data, ...(target !== undefined ? [target] : []));
    const max = Math.max(...data, ...(target !== undefined ? [target] : []));
    const norm = (v) => (max === min ? 0.5 : (v - min) / (max - min));
    const path = data
      .map((v, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - norm(v) * 100;
        return `${i ? 'L' : 'M'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
    const lastY = 100 - norm(data[data.length - 1]) * 100;
    const tY = target === undefined ? undefined : 100 - norm(target) * 100;
    return { d: path, lastY, tY };
  }, [data, target]);

  return (
    <svg viewBox="0 0 100 100" className="w-full" style={{ height }} preserveAspectRatio="none" aria-hidden>
      {tY !== undefined && (
        <line x1="0" x2="100" y1={tY} y2={tY} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3" />
      )}
      {d ? <path d={d} fill="none" stroke={color} strokeWidth="3" /> : null}
      <circle cx="100" cy={lastY} r="2.5" fill={color} />
    </svg>
  );
}

function Bullet({ value = 0.7, min = 0, max = 5, zones = [1, 3] }) {
  const clamp = (v) => Math.max(min, Math.min(max, v));
  const v = clamp(value);
  const total = max - min || 1;
  const w1 = ((zones[0] - min) / total) * 100;
  const w2 = ((zones[1] - zones[0]) / total) * 100;
  const w3 = 100 - w1 - w2;
  const pct = ((v - min) / total) * 100;

  return (
    <div className="w-full">
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200">
        {/* ✅ 合并 className */}
        <div className="absolute inset-y-0 left-0 bg-green-200" style={{ width: `${w1}%` }} />
        <div className="absolute inset-y-0 bg-amber-200" style={{ left: `${w1}%`, width: `${w2}%` }} />
        <div className="absolute inset-y-0 right-0 bg-rose-200" style={{ width: `${w3}%` }} />
        <div
          className="absolute -top-1 h-4 w-4 rounded-full border-2 border-white shadow"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
    </div>
  );
}

function Health({ status }) {
  if (!status) return <div className="h-5" />;
  const map = {
    ok: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', label: 'Healthy' },
    warn: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Attention' },
    err: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Issue' },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${s.bg} ${s.text}`}>
      <span className={`w-2 h-2 rounded-full ${s.dot}`} /> {s.label}
    </span>
  );
}

/* ===== main card ===== */
export default function StatCard({
  className = '',
  variant = 'metric', // "metric" | "ring" | "bullet"
  density = 'compact', // "compact" | "cozy"
  accent = 'green',
  icon: Icon,
  label,
  value,
  delta,
  invert = false,
  cadence,
  spark = [],
  sparkHeight = 24,
  target, // number -> Sparkline SLA 虚线
  ringValue,
  bulletValue,
  bulletMin = 0,
  bulletMax = 5,
  bulletZones = [1, 3],
  status,
  base = 'vs yesterday',
}) {
  const A = ACCENTS[accent] ?? ACCENTS.green;
  const D =
    density === 'compact'
      ? { pad: 'p-3', header: 48, value: 54, trend: sparkHeight, footer: 20 }
      : { pad: 'p-4', header: 56, value: 64, trend: sparkHeight + 8, footer: 24 };

  return (
    <div className={`h-full rounded-2xl border border-slate-200 bg-white ${D.pad} ring-1 ${A.ring} ${className}`}>
      <div className="flex flex-col h-full">
        {/* Row 1: Header（标题 + delta 独占一行，固定高度） */}
        <div style={{ minHeight: D.header }}>
          <div className="flex items-start gap-2 min-w-0">
            {Icon && <Icon className="w-5 h-5 text-slate-500 shrink-0" />}
            <span className="text-sm text-slate-700 leading-tight whitespace-normal break-words">{label}</span>
          </div>
          <div className="mt-2 h-5 flex items-center">
            {typeof delta === 'number' ? (
              <DeltaBadge delta={delta} invert={invert} base={base} />
            ) : (
              <div className="h-5" />
            )}
          </div>
        </div>

        {/* Row 2: Value（固定高度，底对齐） */}
        <div style={{ minHeight: D.value }} className="mt-1 flex items-end">
          <div className="text-2xl md:text-[26px] font-semibold tracking-tight text-slate-900 whitespace-nowrap">
            {value}
          </div>
        </div>

        {/* Row 3: 图形区域（紧凑） */}
        <div className="mt-2" style={{ height: D.trend }}>
          {variant === 'metric' && <Sparkline data={spark} color={A.stroke} height={sparkHeight} target={target} />}
          {variant === 'bullet' && (
            <Bullet value={bulletValue ?? 0} min={bulletMin} max={bulletMax} zones={bulletZones} />
          )}
          {variant === 'ring' && (
            <div className="h-full flex items-center">
              <svg viewBox="0 0 48 48" className="w-12 h-12" aria-hidden>
                <circle cx="24" cy="24" r="18" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                <circle
                  cx="24"
                  cy="24"
                  r="18"
                  fill="none"
                  stroke={A.stroke}
                  strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 18} ${2 * Math.PI * 18}`}
                  strokeDashoffset={`${(1 - Math.max(0, Math.min(100, ringValue || 0)) / 100) * 2 * Math.PI * 18}`}
                  strokeLinecap="round"
                  transform="rotate(-90 24 24)"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Row 4: Footer（固定高度） */}
        <div style={{ height: D.footer }} className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span className="truncate">{cadence}</span>
          <Health status={status} />
        </div>
      </div>
    </div>
  );
}
