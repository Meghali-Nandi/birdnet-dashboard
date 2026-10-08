// src/components/CalendarHeatmapCard.jsx
import { ResponsiveCalendar } from '@nivo/calendar';

/* 浅色主题，和你现在的 UI 同风格 */
const LIGHT_THEME = {
  textColor: '#0f172a', // slate-900
  fontSize: 12,
  grid: { line: { stroke: '#e5e7eb', strokeWidth: 1 } }, // slate-200
  tooltip: { container: { background: '#111827', color: '#fff', borderRadius: 8 } },
};

/* 简单卡片外观封装 */
function Card({ title, right, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

/* 安全的本地日期格式（避免 toISOString 的时区偏移） */
function toLocalISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* 生成最近 nDays 的 mock 数据 */
function mockDaily(nDays = 210) {
  const today = new Date();
  const out = [];
  for (let i = 0; i < nDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = toLocalISO(d);
    const base = 70 + 40 * Math.sin(i / 9) + 25 * Math.cos(i / 5);
    out.push({ day: iso, value: Math.max(0, Math.round(base + (Math.random() * 40 - 20))) });
  }
  return out.reverse();
}

/**
 * CalendarHeatmapCard
 * props:
 * - days?: number            展示最近 N 天（mock）
 * - height?: number          图高度
 * - title?: string           标题
 * - note?: string            右上角说明
 * - colors?: string[]        渐变色从浅到深
 * - data?: {day:string,value:number}[]  // 可传真实数据，传了就不会用 mock
 */
export default function CalendarHeatmapCard({
  days = 210,
  height = 200,
  title = 'Detections by Day (Calendar)',
  note = 'mock • daily',
  colors = ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#2563eb'],
  data: incoming,
}) {
  const data = incoming ?? mockDaily(days);
  const from = data[0]?.day;
  const to = data[data.length - 1]?.day;

  return (
    <Card title={title} right={<div className="text-sm text-slate-500">{note}</div>}>
      {/* Nivo 的 ResponsiveCalendar 需要一个有固定高度的父容器 */}
      <div style={{ height }}>
        <ResponsiveCalendar
          data={data}
          from={from}
          to={to}
          emptyColor="#f1f5f9"
          colors={colors}
          margin={{ top: 12, right: 20, bottom: 12, left: 20 }}
          yearSpacing={36}
          monthBorderColor="#e5e7eb"
          dayBorderColor="#e5e7eb"
          theme={LIGHT_THEME}
        />
      </div>
    </Card>
  );
}
