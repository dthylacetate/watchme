import type { DeviceState } from "@/lib/api";

// ---------------------------------------------------------------------------
// App name → display emoji. Falls back to 💻.
// ---------------------------------------------------------------------------
const APP_EMOJI: Record<string, string> = {
  "VS Code": "💻",
  "Xcode": "🔨",
  "Chrome": "🌐",
  "Safari": "🧭",
  "Firefox": "🦊",
  "Terminal": "⬛",
  "Finder": "📁",
  "Spotify": "🎵",
  "YouTube": "▶️",
  "Steam": "🎮",
  "Discord": "💬",
  "Slack": "💬",
  "Figma": "🎨",
  "Notion": "📝",
  "Obsidian": "🗒️",
};

function getEmoji(appName: string | null | undefined): string {
  if (!appName) return "💻";
  return APP_EMOJI[appName] ?? "💻";
}

// ---------------------------------------------------------------------------
// Color palettes
// ---------------------------------------------------------------------------
const DAY = {
  wall: "#efe5d0",
  baseboard: "#d4b896",
  floor: "#c8935a",
  floorLine: "#b07840",
  winFill: "#fffce8",
  winStroke: "#c8a860",
  curtain: "#f0b0c0",
  curtainStroke: "#d890a0",
  desk: "#a06830",
  deskLeg: "#7a4e20",
  monBg: "#1e1e2e",
  monBorder: "#6688ee",
  charHair: "#8B4513",
  charSkin: "#ffd5a8",
  charBody: "#e87070",
  charLimb: "#ffd5a8",
  charLeg: "#7a3030",
  charEye: "#3a3a8a",
  label: "#e87070",
};

const NIGHT = {
  wall: "#16213e",
  baseboard: "#2a2a4e",
  floor: "#2c1a0e",
  floorLine: "#1e1008",
  winFill: "#0a0f1e",
  winStroke: "#3a3a6e",
  curtain: "#4a2060",
  curtainStroke: "#6a3080",
  desk: "#3a2010",
  deskLeg: "#2a1808",
  monBg: "#060810",
  monBorder: "#4466ff",
  charHair: "#5a3080",
  charSkin: "#ffd5a8",
  charBody: "#6633aa",
  charLimb: "#ffd5a8",
  charLeg: "#44228a",
  charEye: "#8855cc",
  label: "#6633aa",
};

type Colors = typeof DAY;

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------
const RW = 800;       // room viewBox width
const RH = 310;       // room viewBox height
const FLOOR_Y = 230;  // y where floor starts
const SLOT_W = 170;   // width of each device slot
const DESK_H = 28;
const DESK_Y = FLOOR_Y - DESK_H;   // 202
const MON_W = 100;
const MON_H = 50;
const MON_Y = DESK_Y - MON_H - 4;  // 148

/** Centre x of slot i (out of total) */
function slotCx(i: number, total: number): number {
  const usable = RW - 60;
  const spacing = usable / total;
  return 30 + spacing * i + spacing / 2;
}

// ---------------------------------------------------------------------------
// Sub-components (all pure SVG)
// ---------------------------------------------------------------------------

function RoomBackground({ c, isNightMode }: { c: Colors; isNightMode: boolean }) {
  const winX = RW / 2 - 50;
  const winY = 15;
  const winW = 100;
  const winH = 70;

  return (
    <>
      {/* Wall */}
      <rect width={RW} height={FLOOR_Y} fill={c.wall} />
      {/* Baseboard */}
      <rect x={0} y={FLOOR_Y - 8} width={RW} height={8} fill={c.baseboard} />
      {/* Floor */}
      <rect x={0} y={FLOOR_Y} width={RW} height={RH - FLOOR_Y} fill={c.floor} />
      {/* Floor horizontal planks */}
      {[12, 26, 40, 54, 68].map((off) => (
        <line key={off} x1={0} y1={FLOOR_Y + off} x2={RW} y2={FLOOR_Y + off}
          stroke={c.floorLine} strokeWidth={1} opacity={0.5} />
      ))}
      {/* Floor vertical grain */}
      {[100, 220, 360, 500, 650].map((x) => (
        <line key={x} x1={x} y1={FLOOR_Y} x2={x} y2={RH}
          stroke={c.floorLine} strokeWidth={1} opacity={0.3} />
      ))}

      {/* Window frame */}
      <rect x={winX} y={winY} width={winW} height={winH}
        rx={4} fill={c.winFill} stroke={c.winStroke} strokeWidth={2.5} />
      <rect x={winX + 2} y={winY + 2} width={winW - 4} height={winH - 4}
        rx={3} fill={c.winFill} />
      {/* Window panes */}
      <line x1={RW / 2} y1={winY + 2} x2={RW / 2} y2={winY + winH - 2}
        stroke={c.winStroke} strokeWidth={1.5} />
      <line x1={winX + 2} y1={winY + winH / 2} x2={winX + winW - 2} y2={winY + winH / 2}
        stroke={c.winStroke} strokeWidth={1.5} />

      {/* Sun or Moon */}
      {isNightMode ? (
        <>
          <circle cx={RW / 2 - 16} cy={winY + 19} r={11} fill="#f0e060" opacity={0.65} />
          <circle cx={RW / 2 - 10} cy={winY + 15} r={8} fill={c.winFill} opacity={0.7} />
          {([[RW/2+20, winY+9], [RW/2+28, winY+46], [RW/2-8, winY+54]] as [number,number][]).map(([sx, sy], i) => (
            <circle key={i} cx={sx} cy={sy} r={1.2} fill="white" opacity={0.6} />
          ))}
        </>
      ) : (
        <circle cx={RW / 2 - 16} cy={winY + 19} r={10} fill="#ffdd44" opacity={0.75} />
      )}

      {/* Curtains */}
      <rect x={winX - 16} y={winY - 3} width={20} height={winH + 6}
        rx={4} fill={c.curtain} stroke={c.curtainStroke} strokeWidth={1} />
      <rect x={winX + winW - 4} y={winY - 3} width={20} height={winH + 6}
        rx={4} fill={c.curtain} stroke={c.curtainStroke} strokeWidth={1} />

      {/* Pixel plant (centred between slots) */}
      <PixelPlant x={RW / 2} y={FLOOR_Y - 5} c={c} />
    </>
  );
}

function PixelPlant({ x, y, c }: { x: number; y: number; c: Colors }) {
  void c; // c unused for plant colors (fixed naturalistic greens)
  return (
    <g>
      {/* Pot */}
      <rect x={x - 12} y={y} width={24} height={18} rx={3} fill="#9a6830" />
      <rect x={x - 14} y={y - 2} width={28} height={5} rx={2} fill="#b07840" />
      {/* Stem */}
      <rect x={x - 2} y={y - 22} width={4} height={24} rx={1} fill="#508030" />
      {/* Leaves */}
      <ellipse cx={x - 12} cy={y - 24} rx={10} ry={7} fill="#60a040"
        transform={`rotate(-20,${x - 12},${y - 24})`} />
      <ellipse cx={x + 12} cy={y - 28} rx={10} ry={7} fill="#508030"
        transform={`rotate(20,${x + 12},${y - 28})`} />
      <ellipse cx={x} cy={y - 36} rx={8} ry={6} fill="#68b048" />
    </g>
  );
}

function Character({ cx, baseY, online, c }: {
  cx: number; baseY: number; online: boolean; c: Colors;
}) {
  const breatheStyle = online ? {
    animation: "pixel-breathe 3s ease-in-out infinite",
    transformBox: "fill-box" as const,
    transformOrigin: "bottom center",
  } : {};

  return (
    <g opacity={online ? 1 : 0.35} style={breatheStyle}>
      {/* Hair */}
      <rect x={cx - 10} y={baseY - 52} width={20} height={10} rx={4} fill={c.charHair} />
      {/* Head */}
      <rect x={cx - 9} y={baseY - 46} width={18} height={20} rx={4} fill={c.charSkin} />

      {online ? (
        <>
          {/* Open eyes */}
          <rect x={cx - 6} y={baseY - 40} width={4} height={4} rx={1} fill={c.charEye} />
          <rect x={cx + 2} y={baseY - 40} width={4} height={4} rx={1} fill={c.charEye} />
          {/* Eye highlights */}
          <rect x={cx - 5} y={baseY - 40} width={1.5} height={1.5} rx={0.5} fill="white" opacity={0.7} />
          <rect x={cx + 3} y={baseY - 40} width={1.5} height={1.5} rx={0.5} fill="white" opacity={0.7} />
          {/* Mouth */}
          <rect x={cx - 3} y={baseY - 32} width={6} height={2} rx={1} fill="#e08070" />
        </>
      ) : (
        <>
          {/* Closed eyes */}
          <line x1={cx - 6} y1={baseY - 38} x2={cx - 2} y2={baseY - 38}
            stroke="#555" strokeWidth={1.5} strokeLinecap="round" />
          <line x1={cx + 2} y1={baseY - 38} x2={cx + 6} y2={baseY - 38}
            stroke="#555" strokeWidth={1.5} strokeLinecap="round" />
          {/* Drooped mouth */}
          <rect x={cx - 3} y={baseY - 31} width={6} height={2} rx={1} fill="#aa8888" />
          {/* zzz (animated) */}
          <text x={cx + 12} y={baseY - 48} fontSize={9} fill="#aaa"
            style={{ animation: "pixel-zzz 2s ease-in-out infinite" }}>z</text>
          <text x={cx + 18} y={baseY - 55} fontSize={7} fill="#bbb"
            style={{ animation: "pixel-zzz 2s ease-in-out infinite", animationDelay: "0.4s" }}>z</text>
          <text x={cx + 22} y={baseY - 61} fontSize={5} fill="#ccc"
            style={{ animation: "pixel-zzz 2s ease-in-out infinite", animationDelay: "0.8s" }}>z</text>
        </>
      )}

      {/* Body */}
      <rect x={cx - 10} y={baseY - 26} width={20} height={18} rx={3} fill={c.charBody} />
      {/* Arms */}
      <rect x={cx - 20} y={baseY - 22} width={12} height={8} rx={3} fill={c.charLimb} />
      <rect x={cx + 8} y={baseY - 22} width={12} height={8} rx={3} fill={c.charLimb} />
      {/* Legs */}
      <rect x={cx - 9} y={baseY - 8} width={8} height={14} rx={2.5} fill={c.charLeg} />
      <rect x={cx + 1} y={baseY - 8} width={8} height={14} rx={2.5} fill={c.charLeg} />
    </g>
  );
}

function DeviceSlot({ device, cx, c }: { device: DeviceState; cx: number; c: Colors }) {
  const online = device.is_online === 1;
  const monLeft = cx - MON_W / 2;
  const deskLeft = cx - SLOT_W / 2;
  const emoji = getEmoji(device.app_name);
  const appLabel = device.app_name ?? "";

  return (
    <g>
      {/* Monitor */}
      <rect x={monLeft} y={MON_Y} width={MON_W} height={MON_H}
        rx={3} fill={c.monBg}
        stroke={online ? c.monBorder : "#333"}
        strokeWidth={2}
        style={online ? { animation: "pixel-screen-glow 4s ease-in-out infinite" } : {}}
      />
      <rect x={monLeft + 2} y={MON_Y + 2} width={MON_W - 4} height={MON_H - 4}
        rx={2} fill="#060810" />

      {/* Monitor stand */}
      <rect x={cx - 6} y={MON_Y + MON_H} width={12} height={5} rx={1} fill={c.deskLeg} />

      {/* Screen content — foreignObject for reliable emoji + text rendering */}
      {online && (
        <foreignObject x={monLeft + 2} y={MON_Y + 2} width={MON_W - 4} height={MON_H - 4}>
          {/* @ts-expect-error: xmlns is required for SVG foreignObject children */}
          <div xmlns="http://www.w3.org/1999/xhtml" style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            height: "100%", overflow: "hidden", userSelect: "none",
          }}>
            <span style={{ fontSize: "20px", lineHeight: "1.1" }}>{emoji}</span>
            <span style={{
              fontSize: "7px", color: "#88aaff",
              whiteSpace: "nowrap", overflow: "hidden",
              textOverflow: "ellipsis", maxWidth: "88px", marginTop: "2px",
            }}>{appLabel}</span>
          </div>
        </foreignObject>
      )}

      {/* Desk */}
      <rect x={deskLeft} y={DESK_Y} width={SLOT_W} height={DESK_H} rx={3} fill={c.desk} />
      <rect x={deskLeft + 12} y={DESK_Y + DESK_H} width={12} height={26} rx={3} fill={c.deskLeg} />
      <rect x={deskLeft + SLOT_W - 24} y={DESK_Y + DESK_H} width={12} height={26} rx={3} fill={c.deskLeg} />

      {/* Character */}
      <Character cx={cx} baseY={DESK_Y} online={online} c={c} />

      {/* Name label */}
      <rect x={cx - 44} y={FLOOR_Y + 12} width={88} height={14} rx={7}
        fill={online ? c.label : "#555"} opacity={online ? 0.9 : 0.4} />
      <text x={cx} y={FLOOR_Y + 22} fontSize={8} fill="white"
        textAnchor="middle" fontFamily="monospace">
        {device.device_name} {online ? "●" : "○"}
      </text>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export default function PixelRoom({
  devices,
  isNightMode,
}: {
  devices: DeviceState[];
  isNightMode: boolean;
}) {
  const c = isNightMode ? NIGHT : DAY;
  const total = Math.max(devices.length, 1);

  return (
    <div className="pixel-room-wrapper">
      <svg
        width="100%"
        viewBox={`0 0 ${RW} ${RH}`}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="像素风设备活动房间"
        style={{ display: "block", minWidth: "240px" }}
      >
        <RoomBackground c={c} isNightMode={isNightMode} />

        {devices.map((device, i) => (
          <DeviceSlot
            key={device.device_id}
            device={device}
            cx={slotCx(i, total)}
            c={c}
          />
        ))}
      </svg>
    </div>
  );
}
