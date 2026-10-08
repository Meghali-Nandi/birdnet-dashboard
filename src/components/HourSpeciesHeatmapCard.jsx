// src/components/HourSpeciesHeatmapCard.jsx
import { useEffect, useMemo, useState } from 'react';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import axiosInstance from '../api';

const LIGHT_THEME = {
  textColor: '#0f172a',
  fontSize: 12,
  grid: { line: { stroke: '#e5e7eb', strokeWidth: 1 } },
  tooltip: { container: { background: '#111827', color: '#fff', borderRadius: 8 } },
};

const HOURS = Array.from({ length: 24 }, (_, i) => `${i}:00`);

function Card({ title, right, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 w-full">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const idx = Math.min(a.length - 1, Math.max(0, Math.floor(p * (a.length - 1))));
  return a[idx];
}

function toNivoHeat(payload, { topK, minCount, clipP }) {
  if (!payload || !Array.isArray(payload.species) || !Array.isArray(payload.data)) {
    return { data: [], minValue: 0, maxValue: 0, hasValues: false };
  }

  const totals = {};
  for (let i = 0; i < 24; i++) {
    const row = payload.data[i] || {};
    for (const sp of Object.keys(row)) {
      const val = Number(row[sp] || 0);
      totals[sp] = (totals[sp] || 0) + val;
    }
  }

  const sortedSpecies = (payload.species || []).slice().sort((a, b) => (totals[b] || 0) - (totals[a] || 0));
  const picked = topK > 0 ? sortedSpecies.slice(0, topK) : sortedSpecies;

  const out = picked.map((sp) => ({
    id: sp,
    data: HOURS.map((h, i) => {
      const v = Number((payload.data[i] || {})[sp] || 0);
      return { x: h, y: v >= minCount ? v : null };
    }),
  }));

  const nonZeros = [];
  for (const series of out) {
    for (const cell of series.data) {
      if (typeof cell.y === 'number' && cell.y > 0) nonZeros.push(cell.y);
    }
  }
  const hasValues = nonZeros.length > 0;
  const minValue = nonZeros.length ? Math.min(...nonZeros) : 0;
  const clippedMax = nonZeros.length ? percentile(nonZeros, clipP) : 0;
  const maxValue = Math.max(clippedMax, minValue);

  return { data: out, minValue, maxValue, hasValues };
}

export default function HourSpeciesHeatmapCard({
  date,
  topK = 15,
  minCount = 1,
  clipP = 0.98,
  rowHeight = 22,
  minHeight = 240,
}) {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStream = async () => {
      try {
        setLoading(true);
        const params = {};
        if (date) params.date = date;
        const { data } = await axiosInstance.get('/metrics/species/stream', { params });
        setPayload(data);
      } catch (e) {
        console.error('fetch /metrics/species/stream failed', e);
        setPayload(null);
      } finally {
        setLoading(false);
      }
    };
    fetchStream();
  }, [date]);

  const { data, minValue, maxValue, hasValues } = useMemo(
    () => toNivoHeat(payload, { topK, minCount, clipP }),
    [payload, topK, minCount, clipP]
  );

  const speciesCount = hasValues ? data.length : 1;
  const height = Math.max(minHeight, speciesCount * rowHeight + 80);

  return (
    <Card title="Hourly Activity × Species" right={<div className="text-xs text-slate-500">24h</div>}>
      <div className="w-full" style={{ height }}>
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">loading…</div>
        ) : !hasValues ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-slate-500 text-sm rounded-xl border border-slate-200 px-4 py-3 bg-slate-50">
              No detections for today.
            </div>
          </div>
        ) : (
          <ResponsiveHeatMap
            data={data}
            margin={{ top: 8, right: 80, bottom: 42, left: 160 }}
            colors={{ type: 'sequential', scheme: 'blues' }}
            emptyColor="#f1f5f9"
            minValue={minValue}
            maxValue={maxValue}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 0,
              tickPadding: 8,
              tickRotation: 0,
              tickValues: HOURS.filter((_, i) => i % 3 === 0),
            }}
            axisLeft={{ tickSize: 0, tickPadding: 6 }}
            enableLabels={false}
            hoverTarget="cell"
            cellOpacity={0.95}
            cellBorderColor="#ffffff"
            theme={LIGHT_THEME}
            legends={[
              {
                anchor: 'right',
                direction: 'column',
                translateX: 24,
                itemCount: 5,
                itemWidth: 10,
                itemHeight: 10,
                length: 140,
                thickness: 10,
                title: 'detections',
                tickSize: 0,
                tickPadding: 6,
              },
            ]}
            valueFormat={(v) => (v == null ? '' : `${v}`)}
          />
        )}
      </div>
    </Card>
  );
}
