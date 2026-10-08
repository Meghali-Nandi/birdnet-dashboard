// src/pages/Species.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import axiosInstance from '../api';
import { ResponsiveHeatMapCanvas } from '@nivo/heatmap';
import { ResponsiveCalendar } from '@nivo/calendar';
import { ResponsiveLine } from '@nivo/line';
import { motion, AnimatePresence } from 'framer-motion';
import { FiRefreshCcw, FiSearch } from 'react-icons/fi';

const SERVERS = [{ id: 'srvA', name: 'Field Server', baseUrl: 'http://100.85.146.73:5173' }];
const YEARS = [2025];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MIN_MAX_COLORS = ['#ffffff', '#FEDC00'];
const CAL_YELLOWS = ['#ffffff', '#FFEFA6', '#FFE36B', '#FEDC00'];
const CAL_EMPTY = '#FFFDF0';

const LEFT_RAIL_WIDTH = 280;
const ROW_HEIGHT = 42;

const safeName = (s) => String(s ?? '').replace(/_/g, ' ');

const slugifySpecies = (s) =>
  safeName(s)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

const speciesPhotoUrl = (baseUrl, species) => `${baseUrl}/assets/species/${slugifySpecies(species)}.jpg`;

const HeatmapSkeleton = ({ height = 560 }) => (
  <div className="bg-white rounded-xl border shadow p-6 flex flex-col gap-4 animate-pulse">
    <div className="h-4 w-48 bg-gray-200 rounded" />
    <div className="flex-1 rounded bg-gray-100" style={{ height }} />
    <div className="text-sm text-gray-400">Loading species overview…</div>
  </div>
);

const EmptyPlaceholder = ({ text = 'No data available' }) => (
  <div className="bg-white rounded-xl border shadow flex items-center justify-center h-64">
    <span className="text-gray-500">{text}</span>
  </div>
);

function useDebounced(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/* ======================================================================= */
export default function Species() {
  const [serverIdx, setServerIdx] = useState(0);
  const server = SERVERS[serverIdx] || { baseUrl: '' };

  const [devices, setDevices] = useState([]);
  const [device, setDevice] = useState('');
  const [year, setYear] = useState(YEARS[0]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const qDebounced = useDebounced(q, 250);
  const [sortBy, setSortBy] = useState('total_desc');
  const [selected, setSelected] = useState(null);

  const railRef = useRef(null);
  const chartRef = useRef(null);

  const req = (cfg) => axiosInstance({ baseURL: server.baseUrl, ...cfg });

  /* 拉设备 */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await req({ url: '/api/recordings/devices', method: 'GET' });
        const ds = data?.devices || [];
        setDevices(ds);
        setDevice((d) => (ds.includes(d) ? d : ds[0] || ''));
      } catch {
        setDevices([]);
        setDevice('');
      }
    })();
    setRows([]);
    setSelected(null);
  }, [serverIdx]);

  /* 拉 overview */
  const fetchOverview = async () => {
    if (!device) return;
    setLoading(true);
    try {
      const { data } = await req({ url: '/api/species/overview', method: 'GET', params: { device, year } });
      setRows(data?.rows || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchOverview();
  }, [device, year]);

  /* 过滤 + 排序 */
  const filtered = useMemo(() => {
    let list = rows;
    if (qDebounced.trim()) {
      const s = qDebounced.trim().toLowerCase();
      list = list.filter((r) => safeName(r.species).toLowerCase().includes(s));
    }
    if (sortBy === 'total_desc') {
      list = [...list].sort((a, b) => b.total - a.total || a.species.localeCompare(b.species));
    } else if (sortBy === 'name_asc') {
      list = [...list].sort((a, b) => a.species.localeCompare(b.species));
    } else if (sortBy === 'peak_month') {
      const peak = (r) => r.months.reduce((m, v, i) => (v > r.months[m] ? i : m), 0);
      list = [...list].sort((a, b) => peak(a) - peak(b) || b.total - a.total);
    }
    return list;
  }, [rows, qDebounced, sortBy]);

  // ✅ heatmapData 的顺序与 filtered 一致，便于左侧轨逐行对齐
  const heatmapData = useMemo(
    () => filtered.map((r) => ({ id: r.species, data: r.months.map((v, i) => ({ x: MONTHS[i], y: v })) })),
    [filtered]
  );

  const globalMax = useMemo(() => {
    let m = 0;
    for (const r of rows) for (const v of r.months) if (v > m) m = v;
    return Math.max(m, 1);
  }, [rows]);

  // 行高 / 容器高度
  const rowCount = heatmapData.length || 1;
  const desiredHeight = 44 + ROW_HEIGHT * rowCount + 12;
  const viewportMax = 0.7 * (typeof window !== 'undefined' ? window.innerHeight : 900);
  const outerHeight = Math.min(Math.max(520, viewportMax), 1000);

  const noData = !loading && rows.length === 0;

  // ✅ 双向滚动同步（纵向）
  const syncScroll = (from, to) => {
    if (!from || !to) return;
    to.scrollTop = from.scrollTop;
  };

  return (
    <div className="p-4 space-y-4">
      {/* 工具条 */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          className="px-2 py-1.5 rounded border bg-white"
          value={serverIdx}
          onChange={(e) => setServerIdx(parseInt(e.target.value, 10))}
        >
          {SERVERS.map((s, i) => (
            <option key={i} value={i}>
              {s.name || s.baseUrl}
            </option>
          ))}
        </select>

        <select
          className="px-2 py-1.5 rounded border bg-white"
          value={device}
          onChange={(e) => setDevice(e.target.value)}
        >
          {devices.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          className="px-2 py-1.5 rounded border bg-white"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value, 10))}
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <div className="relative">
          <FiSearch className="absolute left-2 top-2.5 text-gray-400" />
          <input
            className="pl-8 pr-3 py-1.5 rounded border bg-white w-64"
            placeholder="Search species…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <select
          className="px-2 py-1.5 rounded border bg-white"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="total_desc">Sort by total (desc)</option>
          <option value="name_asc">Sort by name (A→Z)</option>
          <option value="peak_month">Sort by peak month</option>
        </select>

        <button
          className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded border bg-white hover:bg-gray-50"
          onClick={fetchOverview}
          disabled={loading}
        >
          <FiRefreshCcw /> {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* 图例 */}
      {!loading && !noData && (
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>Less</span>
          <div
            className="h-2 w-44 rounded"
            style={{ background: `linear-gradient(90deg, ${MIN_MAX_COLORS[0]}, ${MIN_MAX_COLORS[1]})` }}
          />
          <span>More</span>
          <span className="ml-auto text-gray-500 text-sm">{filtered.length} species</span>
        </div>
      )}

      {/* 内容区域 */}
      {loading ? (
        <HeatmapSkeleton height={outerHeight} />
      ) : noData ? (
        <EmptyPlaceholder />
      ) : (
        <div className="bg-white rounded-xl shadow border">
          {/* ✅ 左轨（图片+名称） + 右侧热力图，双列并排且纵向联动 */}
          <div className="flex" style={{ height: outerHeight }}>
            {/* 左侧轨：缩略图 + 名称，按行对齐 */}
            <div
              ref={railRef}
              className="overflow-auto border-r"
              style={{ width: LEFT_RAIL_WIDTH }}
              onScroll={(e) => syncScroll(e.currentTarget, chartRef.current)}
            >
              <div style={{ height: desiredHeight, paddingTop: 36, paddingBottom: 8 }}>
                {heatmapData.map((serie, idx) => {
                  const name = safeName(serie.id);
                  const img = speciesPhotoUrl(server.baseUrl, serie.id);
                  return (
                    <div
                      key={serie.id || idx}
                      className="flex items-center gap-3 px-3"
                      style={{ height: ROW_HEIGHT }}
                      title={name}
                      onMouseEnter={(e) => {
                        const img = e.currentTarget.querySelector('img');
                        if (img) img.style.transform = 'scale(1.22)';
                      }}
                      onMouseLeave={(e) => {
                        const img = e.currentTarget.querySelector('img');
                        if (img) img.style.transform = 'scale(1)';
                      }}
                    >
                      <div className="relative">
                        <img
                          src={img}
                          alt={name}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const sib = e.currentTarget.nextSibling;
                            if (sib) sib.style.display = 'flex';
                          }}
                          style={{
                            width: 36,
                            height: 36,
                            objectFit: 'cover',
                            borderRadius: 8,
                            border: '1px solid #e5e7eb',
                          }}
                        />
                        <div
                          style={{
                            display: 'none',
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            border: '1px solid #e5e7eb',
                            background: '#F9FAFB',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            color: '#6B7280',
                            fontWeight: 700,
                          }}
                        >
                          {name.slice(0, 1).toUpperCase()}
                        </div>
                      </div>

                      <div
                        className="text-sm text-gray-800"
                        style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: LEFT_RAIL_WIDTH - 36 - 12 - 16,
                        }}
                      >
                        {name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              ref={chartRef}
              className="overflow-auto flex-1"
              onScroll={(e) => syncScroll(e.currentTarget, railRef.current)}
            >
              <div style={{ height: desiredHeight, minWidth: 980 }}>
                <ResponsiveHeatMapCanvas
                  data={heatmapData}
                  margin={{ top: 36, right: 24, bottom: 8, left: 8 }}
                  enableLabels={false}
                  axisLeft={null}
                  axisTop={{ tickSize: 0, tickPadding: 10 }}
                  colors={{ type: 'sequential', colors: MIN_MAX_COLORS, minValue: 0, maxValue: globalMax }}
                  emptyColor="#FFFDF0"
                  renderCell="rect"
                  borderWidth={0.5}
                  borderColor="#efe7c2"
                  tooltip={({ cell }) => {
                    const species = safeName(cell?.serieId ?? '');
                    const month = String(cell?.data?.x ?? '');
                    const count = Number(cell?.data?.y ?? 0);

                    return (
                      <div
                        style={{
                          transform: 'translate(calc(-100% - 12px), 50%)',
                          background: 'rgba(255,255,255,0.96)',
                          border: '1px solid #e5e7eb',
                          borderRadius: 12,
                          boxShadow: '0 10px 30px rgba(0,0,0,0.14)',
                          padding: 12,
                          color: '#111827',
                          pointerEvents: 'none',
                          backdropFilter: 'saturate(180%) blur(2px)',
                          maxWidth: 360,
                        }}
                      >
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 800,
                                fontSize: 13,
                                lineHeight: '16px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {species || 'Unknown'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                              <span
                                style={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: 3,
                                  background: cell?.color || '#e5e7eb',
                                  border: '1px solid rgba(0,0,0,0.05)',
                                }}
                              />
                              <span style={{ fontSize: 12, opacity: 0.75 }}>{month || '—'}</span>
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            fontWeight: 800,
                            fontSize: 12,
                            lineHeight: '18px',
                            padding: '2px 10px',
                            borderRadius: 999,
                            background: count > 0 ? '#FEDC00' : '#F3F4F6',
                            color: count > 0 ? '#111827' : '#6B7280',
                            border: '1px solid rgba(0,0,0,0.04)',
                          }}
                        >
                          {count}
                        </div>
                      </div>
                    );
                  }}
                  onClick={(cell) => setSelected({ name: String(cell.serieId) })}
                  theme={{
                    axis: { ticks: { text: { fontSize: 11, fill: '#374151' } } },
                    grid: { line: { stroke: '#f1ede0' } },
                    tooltip: { container: { zIndex: 9999 } },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 详情抽屉（保持原样） */}
      <AnimatePresence>
        {selected && (
          <Drawer onClose={() => setSelected(null)}>
            <SpeciesDetail server={server} device={device} year={year} species={selected.name} />
          </Drawer>
        )}
      </AnimatePresence>
    </div>
  );
}

function Drawer({ children, onClose }) {
  return (
    <motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <motion.div
        className="absolute right-0 top-0 h-full w-[540px] bg-white border-l shadow-2xl"
        initial={{ x: 560 }}
        animate={{ x: 0 }}
        exit={{ x: 560 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function SpeciesDetail({ server, device, year, species }) {
  const [data, setData] = useState(null);
  const req = (cfg) => axiosInstance({ baseURL: server.baseUrl, ...cfg });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await req({
          url: '/api/species/detail',
          method: 'GET',
          params: { device, species, year },
        });
        setData(data);
      } catch {
        setData({ daily: [], weekly: [] });
      }
    })();
  }, [server.baseUrl, device, year, species]);

  const calData = useMemo(() => (data?.daily || []).map((d) => ({ day: d.date, value: d.count })), [data]);
  const start = `${year}-01-01`,
    end = `${year}-12-31`;
  const lineData = useMemo(
    () => [{ id: 'weekly', data: (data?.weekly || []).map((w) => ({ x: w.weekStart, y: w.count })) }],
    [data]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="text-lg font-semibold">{safeName(species)}</div>
        <div className="text-gray-500 text-sm">
          {device} · {year}
        </div>
      </div>

      <div className="p-4 space-y-6 overflow-y-auto">
        <div className="bg-gray-50 rounded-xl border">
          <div className="px-4 pt-3 text-sm text-gray-600">Weekly counts</div>
          <div className="h-56 px-2">
            <ResponsiveLine
              data={lineData}
              margin={{ top: 20, right: 18, bottom: 40, left: 56 }}
              xScale={{ type: 'time', format: '%Y-%m-%d', precision: 'day' }}
              xFormat="time:%Y-%m-%d"
              yScale={{ type: 'linear', min: 0, max: 'auto', stacked: false }}
              axisBottom={{ format: '%b', tickValues: 'every 1 month', tickSize: 0, tickPadding: 6 }}
              axisLeft={{ tickSize: 0, tickPadding: 6 }}
              curve="monotoneX"
              enablePoints={false}
              useMesh
              colors={['#F5A623']}
              theme={{
                axis: { ticks: { text: { fontSize: 11 } } },
                grid: { line: { stroke: '#F2EEDB' } },
                tooltip: { container: { zIndex: 60 } },
              }}
            />
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl border">
          <div className="px-4 pt-3 text-sm text-gray-600">Daily calendar</div>
          <div className="h-64 px-2">
            <ResponsiveCalendar
              data={calData}
              from={start}
              to={end}
              emptyColor={CAL_EMPTY}
              colors={CAL_YELLOWS}
              margin={{ top: 10, right: 20, bottom: 20, left: 20 }}
              yearSpacing={30}
              monthBorderColor="#efe7c2"
              dayBorderWidth={1}
              dayBorderColor="#efe7c2"
              legends={[
                {
                  anchor: 'bottom-right',
                  direction: 'row',
                  translateY: 30,
                  itemCount: CAL_YELLOWS.length,
                  itemWidth: 34,
                  itemHeight: 14,
                  itemsSpacing: 6,
                  symbolSize: 14,
                },
              ]}
              theme={{ labels: { text: { fontSize: 11 } }, tooltip: { container: { zIndex: 60 } } }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
