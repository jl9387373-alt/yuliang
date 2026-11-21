import type { CategorySlice } from "../stats";
import { formatYuan } from "../money";
import { CategoryIcon } from "./Icons";

const COLORS: Record<string, string> = {
  food: "#163d2f",
  transport: "#3d8a9a",
  entertainment: "#b8862d",
  study: "#4f7c6b",
  shopping: "#c46b4a",
  other: "#7a8680",
};

function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function arcPath(start: number, slice: number) {
  const [x1, y1] = polar(50, 50, 40, start);
  const [x2, y2] = polar(50, 50, 40, start + slice);
  const large = slice > 180 ? 1 : 0;
  return `M 50 50 L ${x1} ${y1} A 40 40 0 ${large} 1 ${x2} ${y2} Z`;
}

export default function PieChart({ slices }: { slices: CategorySlice[] }) {
  const total = slices.reduce((sum, s) => sum + s.amountFen, 0);
  let cursor = 0;

  return (
    <div className="chart-wrap">
      <svg viewBox="0 0 100 100" width="160" height="160" role="img" aria-label="支出分类饼图">
        {slices.length === 1 ? (
          <circle cx="50" cy="50" r="40" fill={COLORS[slices[0].id]} />
        ) : (
          slices.map((slice) => {
            const angle = (slice.amountFen / total) * 360;
            const path = arcPath(cursor, Math.max(angle, 0.01));
            cursor += angle;
            return <path key={slice.id} d={path} fill={COLORS[slice.id]} />;
          })
        )}
      </svg>
      <div className="legend">
        {slices.map((slice) => (
          <div className="legend-row" key={slice.id}>
            <div className="legend-name">
              <span className="legend-ico" style={{ color: COLORS[slice.id] }}>
                <CategoryIcon id={slice.id} size={15} />
              </span>
              <span>{slice.label}</span>
            </div>
            <strong>{formatYuan(slice.amountFen)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
