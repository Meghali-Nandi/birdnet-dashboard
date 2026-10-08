// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { ResponsiveSankey } from '@nivo/sankey';
import { ResponsiveLine } from '@nivo/line';
import { ResponsiveBar } from '@nivo/bar';
import { motion } from 'framer-motion';
import StatCard from '../components/Dashboard_KPICard';

import { MdDevicesOther } from 'react-icons/md';
import SpeciesStreamCard from '../components/SpeciesStreamCard';

import CalendarHeatmapCard from '../components/CalendarHeatmapCard';
import HourSpeciesHeatmapCard from '../components/HourSpeciesHeatmapCard';
import SpeciesRankBumpCard from '../components/SpeciesRankBumpCard';

import axiosInstance from '../api';

const lightTheme = {
  textColor: '#0f172a',
  fontSize: 12,
  grid: { line: { stroke: '#e5e7eb', strokeWidth: 1 } },
  tooltip: { container: { background: '#111827', color: '#fff', borderRadius: 8 } },
};

const Card = ({ title, right, children, className = '' }) => (
  <div className={`rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 ${className}`}>
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-lg font-semibold">{title}</h3>
      {right}
    </div>
    {children}
  </div>
);

/* ---------------- Mock Data ---------------- */
const sankeyData = {
  nodes: [
    { id: 'Devices' },
    { id: 'Preprocess' },
    { id: 'Infer' },
    { id: 'Postprocess' },
    { id: 'Stored' },
    { id: 'Discarded' },
    { id: 'Alerted' },
  ],
  links: [
    { source: 'Devices', target: 'Preprocess', value: 1200 },
    { source: 'Preprocess', target: 'Infer', value: 1100 },
    { source: 'Infer', target: 'Postprocess', value: 1080 },
    { source: 'Postprocess', target: 'Stored', value: 780 },
    { source: 'Postprocess', target: 'Discarded', value: 250 },
    { source: 'Postprocess', target: 'Alerted', value: 50 },
  ],
};

const lineData = [
  {
    id: 'recordings',
    data: Array.from({ length: 14 }, (_, i) => ({
      x: `D${i + 1}`,
      y: Math.round(450 + 120 * Math.sin(i / 2) + Math.random() * 60),
    })),
  },
  {
    id: 'detections',
    data: Array.from({ length: 14 }, (_, i) => ({
      x: `D${i + 1}`,
      y: Math.round(120 + 40 * Math.cos(i / 2) + Math.random() * 20),
    })),
  },
];

const topSpecies = [
  { species: 'Noisy Miner', count: 136 },
  { species: 'Magpie', count: 104 },
  { species: 'Rainbow Lorikeet', count: 88 },
  { species: 'Currawong', count: 72 },
  { species: 'Kookaburra', count: 61 },
];

const events = [
  { t: '12:41', type: 'Detect', msg: 'Rainbow Lorikeet @ b927 (0.91)' },
  { t: '12:37', type: 'System', msg: 'Analysis service restarted on b816' },
  { t: '12:29', type: 'Alert', msg: 'Unusual silence > 10m @ b87c' },
  { t: '12:18', type: 'Detect', msg: 'Magpie @ b6cf (0.73)' },
];

/* ---------------- Charts ---------------- */
function SankeyCard() {
  return (
    <Card title="Stream Diagram">
      <div className="h-[340px]">
        <ResponsiveSankey
          data={sankeyData}
          margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
          align="justify"
          colors={{ scheme: 'category10' }} // 清晰的高对比配色
          nodeOpacity={1}
          nodeThickness={18}
          nodeSpacing={14}
          nodeBorderWidth={1}
          nodeBorderColor={{ from: 'color', modifiers: [['darker', 0.5]] }}
          linkOpacity={0.5}
          linkBlendMode="multiply"
          linkContract={2}
          label={(n) => `${n.id}`}
          labelTextColor="#0f172a" // 直接指定深色文本
          theme={lightTheme}
        />
      </div>
    </Card>
  );
}

function TrendCard() {
  return (
    <Card title="Recordings & Detections" right={<div className="text-xs text-slate-500">Last 14 days</div>}>
      <div className="h-[280px]">
        <ResponsiveLine
          data={lineData}
          margin={{ top: 10, right: 24, bottom: 32, left: 44 }}
          xScale={{ type: 'point' }}
          yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false }}
          curve="monotoneX"
          axisBottom={{ tickSize: 0, tickPadding: 8 }}
          axisLeft={{ tickSize: 0, tickPadding: 8 }}
          enableGridX={false}
          enablePoints={false}
          useMesh
          colors={['#2563eb', '#16a34a']} // 蓝 + 绿，高对比
          lineWidth={3}
          theme={lightTheme}
        />
      </div>
    </Card>
  );
}

function TopSpeciesCard() {
  return (
    <Card title="Top Species">
      <div className="h-[280px]">
        <ResponsiveBar
          data={topSpecies}
          keys={['count']}
          indexBy="species"
          margin={{ top: 10, right: 10, bottom: 60, left: 44 }}
          padding={0.3}
          layout="horizontal"
          colors={['#0ea5e9']} // 天蓝
          axisBottom={{ tickSize: 0, tickPadding: 8 }}
          axisLeft={{ tickSize: 0, tickPadding: 6 }}
          labelSkipWidth={16}
          labelSkipHeight={12}
          theme={lightTheme}
        />
      </div>
    </Card>
  );
}

/* ---------------- Page ---------------- */
export default function Dashboard() {
  const [onlineTotal, setOnlineTotal] = useState(0);
  const [onlineUp, setOnlineUp] = useState(0);
  const [onlineSpark, setOnlineSpark] = useState([]);

  const [detectionsToday, setDetectionsToday] = useState(0);
  const [detectionsSpark, setDetectionsSpark] = useState([]);

  const [speciesToday, setSpeciesToday] = useState(0);
  const [speciesSpark, setSpeciesSpark] = useState([]);

  const [streamData, setStreamData] = useState({});

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await axiosInstance.get('/metrics/summary');

        console.log('LLALA: ', response.data);
        setOnlineSpark(response.data.online_devices.spark);
        setOnlineTotal(response.data.online_devices.total);
        setOnlineUp(response.data.online_devices.online);

        setDetectionsToday(response.data.detections_today.count);
        setDetectionsSpark(response.data.detections_today.spark);

        setSpeciesToday(response.data.species_today.unique);
        setSpeciesSpark(response.data.species_today.spark);

        console.log('Online Devices:', response.data.spark);
      } catch (error) {
        console.error('Error fetching metrics:', error);
      }
    };

    fetchMetrics();
  }, []);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 text-slate-900">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6 items-stretch">
        {/* 1) 在线设备 */}
        <StatCard
          density="compact"
          variant="metric"
          accent="green"
          icon={MdDevicesOther}
          label="Online Devices"
          value={`${onlineUp} / ${onlineTotal}`}
          delta={
            onlineSpark.length === 0 ||
            isNaN(onlineSpark[onlineSpark.length - 1]) ||
            isNaN(onlineSpark[onlineSpark.length - 2])
              ? 0
              : onlineSpark[onlineSpark.length - 1] - onlineSpark[onlineSpark.length - 2]
          }
          cadence="every 5 mins"
          spark={onlineSpark}
          sparkHeight={24}
          status="ok"
          base="since last 5 minutes"
        />

        <StatCard
          density="compact"
          variant="metric"
          accent="blue"
          icon={MdDevicesOther}
          label="Detections Today"
          value={detectionsToday}
          delta={
            detectionsSpark.length === 0 ||
            isNaN(detectionsSpark[detectionsSpark.length - 1]) ||
            isNaN(detectionsSpark[detectionsSpark.length - 2])
              ? 0
              : detectionsSpark[detectionsSpark.length - 1] - detectionsSpark[detectionsSpark.length - 2]
          }
          cadence="updates hourly"
          spark={detectionsSpark}
          sparkHeight={24}
          status="ok"
          base="vs last hour"
        />

        {/* 3) 今天物种数（紧凑折线） */}
        <StatCard
          density="compact"
          variant="metric"
          accent="violet"
          icon={MdDevicesOther}
          label="Species Today"
          value={speciesToday}
          // If speciesSpark is empty, set delta to 0
          // If speciesSpark[speciesSpark.length - 1] - speciesSpark[speciesSpark.length - 2] is negative or nan, set delta to 0
          delta={
            speciesSpark.length === 0 ||
            isNaN(speciesSpark[speciesSpark.length - 1]) ||
            isNaN(speciesSpark[speciesSpark.length - 2])
              ? 0
              : speciesSpark[speciesSpark.length - 1] - speciesSpark[speciesSpark.length - 2]
          }
          cadence="updates hourly"
          spark={speciesSpark}
          sparkHeight={24}
          status="ok"
          base="vs last hour"
        />

        {/* 4) 平均处理时延：折线 + SLA 虚线（例如目标 200ms） */}
        {/* <StatCard
          density="compact"
          variant="metric"
          accent="amber"
          icon={MdDevicesOther}
          label="Avg Processing (ms, 5m)"
          value="128 ms"
          delta={-3.5}
          invert
          cadence="auto-refresh / 60s (SLA 200ms)"
          spark={[180, 175, 168, 160, 150, 142, 136, 132, 128]}
          sparkHeight={24}
          target={200} // 👈 SLA 虚线
          status="ok"
        /> */}

        {/* 5) 失败率：Bullet 刻度（低更好，目标 <1%） */}
        {/* <StatCard
          density="compact"
          variant="bullet" // 👈 新变体
          accent="rose"
          icon={MdDevicesOther}
          label="Failure Rate (1h)"
          value="0.7%"
          delta={-0.2}
          invert
          cadence="rolling window / 1h (target < 1%)"
          bulletValue={0.7} // 当前值
          bulletMin={0}
          bulletMax={5}
          bulletZones={[1, 3]} // 0-1 绿、1-3 黄、3-5 红
          status="ok"
        /> */}
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <SpeciesStreamCard height={320} />
        </div>
      </div>

      {/* <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-6">
          <CalendarHeatmapCard days={210} height={200} title="Detections by Day" note="daily" />
        </div>

        <div className="col-span-12 lg:col-span-6">
          <CalendarHeatmapCard
            days={90}
            height={200}
            title="Alerts by Day"
            note="daily"
            colors={['#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#e11d48']}
          />
        </div>
      </div> */}

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <HourSpeciesHeatmapCard
            species={['Noisy Miner', 'Magpie', 'Rainbow Lorikeet', 'Currawong', 'Kookaburra']}
            topK={0}
            rowHeight={22}
            minHeight={300}
          />
        </div>

        {/* <div className="col-span-12">
          <SpeciesRankBumpCard
            species={['Noisy Miner', 'Magpie', 'Rainbow Lorikeet', 'Currawong', 'Kookaburra']}
            height={320}
          />
        </div> */}
      </div>
    </div>
  );
}
