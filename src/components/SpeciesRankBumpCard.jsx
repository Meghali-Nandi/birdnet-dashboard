import { ResponsiveBump } from '@nivo/bump';

const LIGHT_THEME = {
  textColor: '#0f172a',
  fontSize: 12,
  grid: { line: { stroke: '#e5e7eb', strokeWidth: 1 } },
  tooltip: { container: { background: '#111827', color: '#fff', borderRadius: 8 } },
};

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

// 生成最近 14 天 Top-N 排名（y 越小排名越高）
function mockBump(species = ['Noisy Miner', 'Magpie', 'Rainbow Lorikeet', 'Currawong', 'Kookaburra'], days = 14) {
  const xs = Array.from({ length: days }, (_, i) => `D-${days - 1 - i}`);
  return species.map((sp, idx) => {
    let rank = idx + 1;
    const data = xs.map((x) => {
      // 加一点随机起伏
      rank = Math.max(1, Math.min(species.length, rank + (Math.random() > 0.6 ? (Math.random() > 0.5 ? 1 : -1) : 0)));
      return { x, y: rank };
    });
    return { id: sp, data };
  });
}

export default function SpeciesRankBumpCard({ species, height = 320 }) {
  const data = mockBump(species);

  return (
    <Card title="Top Species Ranking (14 days)" right={<div className="text-xs text-slate-500">mock • rank</div>}>
      <div style={{ height }}>
        <ResponsiveBump
          data={data}
          margin={{ top: 20, right: 120, bottom: 40, left: 60 }}
          colors={{ scheme: 'category10' }}
          lineWidth={3}
          activeLineWidth={5}
          inactiveLineWidth={2}
          inactiveOpacity={0.3}
          startLabel="id"
          endLabel="id"
          pointSize={8}
          activePointSize={10}
          pointColor={{ theme: 'background' }}
          pointBorderWidth={2}
          pointBorderColor={{ from: 'serie.color' }}
          axisTop={null}
          axisRight={null}
          axisBottom={{ tickSize: 0, tickPadding: 8, tickRotation: 0 }}
          axisLeft={{ tickSize: 0, tickPadding: 6 }}
          theme={LIGHT_THEME}
        />
      </div>
    </Card>
  );
}
