// Heights for each bar — pre-generated for visual variety
const BARS = [4,10,6,14,8,4,12,6,14,8,4,10,14,6,10,4,14,8,6,12,4,10,14,6,8,4,12,14,6,10,4,8,14,6,10,4,12,8,14,6,4,10,14,8,6,12,4,10,6,14,8,4,12,6,14];

type Props = { hasAudio?: boolean };

export default function WaveformDivider({ hasAudio = false }: Props) {
  const color = hasAudio ? "#f59e0b" : "#52525b";
  const maxOpacity = hasAudio ? 0.8 : 0.35;

  return (
    <svg
      viewBox={`0 0 ${BARS.length * 5} 16`}
      xmlns="http://www.w3.org/2000/svg"
      className="w-full"
      style={{ height: 14 }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`wf-${hasAudio ? "a" : "g"}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor={color} stopOpacity={0} />
          <stop offset="25%"  stopColor={color} stopOpacity={maxOpacity * 0.6} />
          <stop offset="50%"  stopColor={color} stopOpacity={maxOpacity} />
          <stop offset="75%"  stopColor={color} stopOpacity={maxOpacity * 0.6} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {BARS.map((h, i) => (
        <rect
          key={i}
          x={i * 5 + 1}
          y={(16 - h) / 2}
          width={2}
          height={h}
          rx={1}
          fill={`url(#wf-${hasAudio ? "a" : "g"})`}
        />
      ))}
    </svg>
  );
}
