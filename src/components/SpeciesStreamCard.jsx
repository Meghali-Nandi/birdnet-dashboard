// src/components/SpeciesStreamCard.jsx
import { useEffect, useState } from 'react';
import { ResponsiveStream } from '@nivo/stream';
import axiosInstance from '../api';

const LIGHT_THEME = {
  textColor: '#0f172a',
  fontSize: 12,
  grid: { line: { stroke: '#e5e7eb', strokeWidth: 1 } },
  tooltip: { container: { background: '#111827', color: '#fff', borderRadius: 8 } },
};

function Pill({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs border transition ${
        active
          ? 'bg-slate-900 text-white border-slate-900'
          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

function Card({ title, right, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export default function SpeciesStreamCard({ height = 320 }) {
  const [species, setSpecies] = useState([]); // 后端返回的全部唯一物种（小写）
  const [active, setActive] = useState([]); // 选中的 keys
  const [hours, setHours] = useState([...Array(24)].map((_, i) => `${i}:00`));
  const [data, setData] = useState([]); // 24 行：每行包含所有 species 的数值（补 0）
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchStream = async () => {
      try {
        setErr(null);
        const res = await axiosInstance.get('/metrics/species/stream'); // /api/metrics/species/stream
        if (!mounted) return;

        // 1) 解析 & 规范化
        const sp = (res.data?.species ?? []).map((s) => (s ?? '').trim().toLowerCase()).filter(Boolean);

        const hrs = (res.data?.hours ?? Array.from({ length: 24 }, (_, i) => i)).slice(0, 24).map((h) => `${h}:00`);

        const raw = (res.data?.data ?? []).slice(0, 24);

        // 2) 统一补零：每一行都包含所有物种的数值（缺失=0），避免 tooltip 出现 undefined
        const uniform = Array.from({ length: 24 }, (_, i) => {
          const src = raw[i] || {};
          const row = {};
          sp.forEach((k) => {
            const v = src[k];
            row[k] = typeof v === 'number' ? v : Number(v ?? 0);
          });
          return row;
        });

        setSpecies(sp);
        setHours(hrs);
        setData(uniform);

        // 3) 默认选中：保留旧选择里仍存在的；若为空则选前 5 个（后端已按总量降序）
        setActive((prev) => {
          const keep = prev.filter((k) => sp.includes(k));
          return keep.length ? keep : sp.slice(0, Math.min(5, sp.length));
        });
      } catch (e) {
        if (mounted) setErr(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStream();
    const id = setInterval(fetchStream, 60 * 60 * 1000); // 每小时刷新一次
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const toggle = (sp) =>
    setActive((prev) => {
      const on = prev.includes(sp);
      // 不允许清空最后一个，至少保留一个 key
      if (on && prev.length === 1) return prev;
      return on ? prev.filter((x) => x !== sp) : [...prev, sp];
    });

  const keys = active.length ? active : species.slice(0, 1); // 兜底保证非空

  return (
    <Card title="Species Stream (24h)" right={<div className="text-xs font-bold text-slate-500">updates hourly</div>}>
      {/* 物种选择 */}
      <div className="mb-3 flex flex-wrap gap-2">
        {species.map((sp) => (
          <Pill key={sp} active={active.includes(sp)} onClick={() => toggle(sp)}>
            {titleCase(sp)}
          </Pill>
        ))}
      </div>

      <div style={{ height }}>
        {err ? (
          <div className="h-full flex items-center justify-center text-sm text-rose-600">
            Failed to load species stream.
          </div>
        ) : loading ? (
          <div className="h-full animate-pulse rounded-lg bg-slate-100" />
        ) : species.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-500">No data for today.</div>
        ) : (
          <ResponsiveStream
            data={data}
            keys={keys}
            colors={{ scheme: 'category10' }}
            offsetType="silhouette"
            order="insideOut"
            curve="monotoneX"
            fillOpacity={0.9}
            borderColor={{ from: 'color', modifiers: [['darker', 0.4]] }}
            enableGridX={true}
            enableGridY={false}
            axisLeft={null}
            axisRight={null}
            margin={{ top: 10, right: 140, bottom: 36, left: 12 }}
            axisBottom={{
              tickSize: 0,
              tickPadding: 8,
              tickValues: [0, 6, 12, 18, 23],
              format: (v) => hours[v] ?? v,
            }}
            enableDots={false}
            theme={LIGHT_THEME}
            legends={[
              {
                anchor: 'bottom-right',
                direction: 'column',
                translateX: 100,
                itemWidth: 110,
                itemHeight: 18,
                symbolShape: 'circle',
                itemTextColor: '#475569',
              },
            ]}
          />
        )}
      </div>
    </Card>
  );
}
