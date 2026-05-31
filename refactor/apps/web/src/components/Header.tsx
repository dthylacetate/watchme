interface HeaderProps {
  displayName: string;
  serverTime?: string;
  viewerCount: number;
}

function getGreeting(): { kaomoji: string; text: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 9) return { kaomoji: "(* ^_^ *)", text: "早上好呀~" };
  if (hour >= 9 && hour < 12) return { kaomoji: "(o´▽`o)", text: "上午好呀~" };
  if (hour >= 12 && hour < 14) return { kaomoji: "(´～`)", text: "午饭时间~" };
  if (hour >= 14 && hour < 18) return { kaomoji: "(´▽`)", text: "下午好呀~" };
  if (hour >= 18 && hour < 22) return { kaomoji: "(^_−)☆", text: "晚上好呀~" };
  return { kaomoji: "(-_-) zZ", text: "夜深啦~" };
}

function formatTime(serverTime?: string): string {
  if (!serverTime) {
    return "--:--";
  }

  const parsed = new Date(serverTime);
  if (Number.isNaN(parsed.getTime())) {
    return "--:--";
  }

  return parsed.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function Header({ displayName, serverTime, viewerCount }: HeaderProps) {
  const greeting = getGreeting();

  return (
    <header className="header-shell separator-dashed">
      <div>
        <h1 className="header-title">{displayName} Now</h1>
        <p className="header-greeting">
          <span>{greeting.kaomoji}</span>
          {greeting.text}
        </p>
      </div>
      <div className="header-meta">
        {viewerCount > 0 ? <div className="header-viewers">{viewerCount} 人正在看~</div> : null}
        <div className="header-clock">{formatTime(serverTime)}</div>
      </div>
    </header>
  );
}
