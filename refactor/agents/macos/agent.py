from __future__ import annotations

import asyncio
import fcntl
import json
import logging
import os
import re
import subprocess
import sys
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Any
from urllib import error, request
from urllib.parse import urlparse, urlunparse

try:
    import pystray
    from PIL import Image, ImageDraw
except Exception:  # pragma: no cover - optional at import time
    pystray = None
    Image = None
    ImageDraw = None


def resolve_base_dir() -> Path:
    if not getattr(sys, "frozen", False):
        return Path(__file__).resolve().parent

    executable = Path(sys.executable).resolve()
    macos_dir = executable.parent
    contents_dir = macos_dir.parent
    app_dir = contents_dir.parent
    if macos_dir.name == "MacOS" and contents_dir.name == "Contents" and app_dir.suffix == ".app":
        return app_dir.parent
    return executable.parent


BASE_DIR = resolve_base_dir()
CONFIG_PATH = BASE_DIR / "config.json"
EXAMPLE_CONFIG_PATH = BASE_DIR / "config.example.json"
LOG_DIR = BASE_DIR / "logs"
LOG_PATH = LOG_DIR / "agent.log"
LOCK_PATH = BASE_DIR / "watchme-agent.lock"
LOOPBACK_HOSTS = {"localhost", "127.0.0.1", "::1"}
MUSIC_APP_IDS = {
    "apple music",
    "music",
    "spotify",
    "qqmusic",
    "qq music",
    "qq音乐",
    "neteasemusic",
    "netease music",
    "netease cloud music",
    "neteasecloudmusic",
    "网易云音乐",
    "163music",
    "163 music",
}
MUSIC_PLAYER_CANDIDATES = [
    ("Spotify", ["Spotify"]),
    ("Apple Music", ["Music", "Apple Music"]),
    ("QQ音乐", ["QQ音乐", "QQMusic", "QQ Music"]),
    ("网易云音乐", ["网易云音乐", "NeteaseMusic", "NetEaseMusic", "NetEase Cloud Music", "Netease Cloud Music", "163Music"]),
]

LOG_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        RotatingFileHandler(LOG_PATH, encoding="utf-8", maxBytes=1_000_000, backupCount=5),
    ],
)
log = logging.getLogger("watchme-agent-macos")


def ensure_config_template() -> None:
    if not CONFIG_PATH.exists() and EXAMPLE_CONFIG_PATH.exists():
        CONFIG_PATH.write_text(EXAMPLE_CONFIG_PATH.read_text(encoding="utf-8"), encoding="utf-8")


def load_config() -> dict[str, Any]:
    ensure_config_template()
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(
            f"Missing config.json. A template has been copied to {CONFIG_PATH.name}; please fill it in first."
        )

    data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    required = ["server_url", "token", "interval_seconds", "heartbeat_seconds", "idle_threshold_seconds"]
    missing = [key for key in required if key not in data]
    if missing:
        raise ValueError(f"Missing config keys: {', '.join(missing)}")

    validate_config(data)
    return data


def validate_config(data: dict[str, Any]) -> None:
    server_url = normalize_server_url(str(data.get("server_url", "")))
    token = str(data.get("token", "")).strip()
    parsed = urlparse(server_url)

    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("server_url must be a valid http/https URL")

    if not token or token == "replace-with-device-token":
        raise ValueError("token is still using the placeholder value")

    for key in ("interval_seconds", "heartbeat_seconds", "idle_threshold_seconds"):
        try:
            numeric = int(data[key])
        except Exception as exc:
            raise ValueError(f"{key} must be an integer") from exc

        if numeric <= 0:
            raise ValueError(f"{key} must be greater than 0")


def normalize_server_url(server_url: str) -> str:
    value = server_url.strip()
    if not value:
        return value

    parsed = urlparse(value)
    hostname = (parsed.hostname or "").lower()
    if hostname != "localhost":
        return value.rstrip("/")

    auth = ""
    if parsed.username:
        auth = parsed.username
        if parsed.password:
            auth += f":{parsed.password}"
        auth += "@"

    port = f":{parsed.port}" if parsed.port else ""
    normalized = parsed._replace(netloc=f"{auth}127.0.0.1{port}")
    return urlunparse(normalized).rstrip("/")


def is_loopback_server_url(server_url: str) -> bool:
    hostname = (urlparse(normalize_server_url(server_url)).hostname or "").lower()
    return hostname in LOOPBACK_HOSTS


def utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def run_command(command: list[str], timeout: float = 3.0) -> str:
    completed = subprocess.run(
        command,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )
    if completed.returncode != 0:
        stderr = completed.stderr.strip()
        stdout = completed.stdout.strip()
        raise RuntimeError(stderr or stdout or f"{command[0]} exited with {completed.returncode}")
    return completed.stdout.strip()


def run_osascript(script: str, timeout: float = 3.0) -> str:
    return run_command(["osascript", "-e", script], timeout=timeout)


def normalize_macos_app_id(app_name: str) -> str:
    normalized = app_name.strip().lower()
    normalized = normalized.removesuffix(".app").strip()
    return re.sub(r"\s+", " ", normalized)


def is_music_app_id(app_id: str) -> bool:
    normalized = normalize_macos_app_id(app_id)
    compact = re.sub(r"[\s._-]+", "", normalized)
    return normalized in MUSIC_APP_IDS or compact in MUSIC_APP_IDS


def parse_tabbed_lines(output: str) -> list[list[str]]:
    rows: list[list[str]] = []
    for line in output.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        rows.append([part.strip() for part in stripped.split("\t")])
    return rows


def get_foreground_info() -> tuple[str, str] | None:
    script = r'''
tell application "System Events"
  set frontApp to first application process whose frontmost is true
  set appName to name of frontApp
  set windowTitle to ""
  try
    set windowTitle to name of front window of frontApp
  end try
  return appName & tab & windowTitle
end tell
'''
    try:
        rows = parse_tabbed_lines(run_osascript(script))
    except Exception as exc:
        log.debug("foreground AppleScript failed: %s", exc)
        return None

    if not rows or not rows[0]:
        return None

    app_name = rows[0][0]
    if not app_name:
        return None

    title = rows[0][1] if len(rows[0]) > 1 else ""
    return normalize_macos_app_id(app_name), title[:256]


def list_open_apps(limit: int = 32, include_music: bool = False) -> list[dict[str, str]]:
    script = r'''
tell application "System Events"
  set outputLines to {}
  repeat with appProcess in (application processes whose background only is false and visible is true)
    set appName to name of appProcess
    set windowTitle to ""
    try
      set windowTitle to name of front window of appProcess
    end try
    set end of outputLines to appName & tab & windowTitle
  end repeat
  set AppleScript's text item delimiters to linefeed
  return outputLines as text
end tell
'''
    try:
        rows = parse_tabbed_lines(run_osascript(script, timeout=5.0))
    except Exception as exc:
        log.debug("open apps AppleScript failed: %s", exc)
        return []

    items: list[dict[str, str]] = []
    seen: set[str] = set()
    for row in rows:
        app_name = row[0] if row else ""
        if not app_name:
            continue
        app_id = normalize_macos_app_id(app_name)
        if is_music_app_id(app_id) and not include_music:
            continue
        if app_id in seen:
            continue
        seen.add(app_id)
        item = {"app_id": app_id}
        if len(row) > 1 and row[1]:
            item["window_title"] = row[1][:256]
        items.append(item)
        if len(items) >= limit:
            break

    return items


def parse_ioreg_idle_seconds(output: str) -> float | None:
    match = re.search(r'"HIDIdleTime"\s*=\s*(\d+)', output)
    if not match:
        return None
    return max(0.0, int(match.group(1)) / 1_000_000_000)


def get_idle_seconds() -> float:
    try:
        output = run_command(["ioreg", "-c", "IOHIDSystem"], timeout=3.0)
        parsed = parse_ioreg_idle_seconds(output)
        if parsed is not None:
            return parsed
    except Exception as exc:
        log.debug("ioreg idle read failed: %s", exc)
    return 0.0


def parse_pmset_battery(output: str) -> dict[str, Any]:
    percent_match = re.search(r"(\d+)%;", output)
    if not percent_match:
        return {}

    percent = int(percent_match.group(1))
    if percent < 0 or percent > 100:
        return {}

    lower = output.lower()
    status_match = re.search(r"\d+%;\s*([^;]+);", output)
    battery_status = status_match.group(1).strip().lower() if status_match else ""
    return {
        "battery_percent": percent,
        "battery_charging": "ac power" in lower or battery_status in {"charging", "charged", "finishing charge"},
    }


def get_battery_extra() -> dict[str, Any]:
    try:
        return parse_pmset_battery(run_command(["pmset", "-g", "batt"], timeout=3.0))
    except Exception as exc:
        log.debug("battery read failed: %s", exc)
        return {}


def parse_pmset_assertions_audio_active(output: str) -> bool:
    lower = output.lower()
    return "coreaudiod" in lower or "audio" in lower and "preventusersystemsleep" in lower


def is_audio_active() -> bool:
    try:
        return parse_pmset_assertions_audio_active(run_command(["pmset", "-g", "assertions"], timeout=3.0))
    except Exception as exc:
        log.debug("audio assertion read failed: %s", exc)
        return False


def is_front_window_fullscreen() -> bool:
    script = r'''
tell application "System Events"
  set frontApp to first application process whose frontmost is true
  try
    return value of attribute "AXFullScreen" of front window of frontApp
  on error
    return false
  end try
end tell
'''
    try:
        return run_osascript(script).strip().lower() == "true"
    except Exception as exc:
        log.debug("fullscreen AppleScript failed: %s", exc)
        return False


def get_scriptable_music_info(display_name: str, app_names: list[str]) -> dict[str, Any] | None:
    for app_name in app_names:
        script = f'''
if application "{app_name}" is running then
  tell application "{app_name}"
    try
      set stateText to player state as text
      if stateText is not "playing" then return ""
    end try
    try
      set trackName to name of current track
      set artistName to ""
      try
        set artistName to artist of current track
      end try
      if trackName is not "" then
        return "{display_name}" & tab & trackName & tab & artistName
      end if
    end try
    try
      set trackName to current track as text
      if trackName is not "" then
        return "{display_name}" & tab & trackName & tab & ""
      end if
    end try
  end tell
end if
return ""
'''
        try:
            music = music_from_rows(parse_tabbed_lines(run_osascript(script)))
        except Exception:
            music = None
        if music:
            return music
    return None


def music_from_rows(rows: list[list[str]]) -> dict[str, Any] | None:
    if not rows or len(rows[0]) < 2:
        return None

    app = rows[0][0].strip() or "Music"
    title = rows[0][1].strip()
    if not title:
        return None

    artist = rows[0][2].strip() if len(rows[0]) > 2 else ""
    return {
        "title": title[:256],
        "artist": artist[:256] if artist else None,
        "app": app[:128],
    }


def parse_music_window_title(app_id: str, window_title: str) -> dict[str, Any] | None:
    title = window_title.strip()
    if not title:
        return None

    normalized_app = normalize_macos_app_id(app_id)
    compact_app = re.sub(r"[\s._-]+", "", normalized_app)
    if "qq" in normalized_app or "qq音乐" in normalized_app:
        app_display = "QQ音乐"
    elif "netease" in normalized_app or "163" in compact_app or "网易云" in normalized_app:
        app_display = "网易云音乐"
    else:
        return None
    noise = {
        normalized_app,
        normalize_macos_app_id(app_display),
        "qqmusic",
        "qq music",
        "neteasemusic",
        "netease cloud music",
    }
    if normalize_macos_app_id(title) in noise:
        return None

    cleaned = re.sub(r"\s+[-–—]\s+(QQ音乐|QQMusic|QQ Music|网易云音乐|NetEase Cloud Music|Netease Cloud Music)$", "", title, flags=re.I).strip()
    separators = [" - ", " – ", " — "]
    for separator in separators:
        if separator in cleaned:
            left, right = [part.strip() for part in cleaned.split(separator, 1)]
            if left and right:
                return {
                    "title": right[:256],
                    "artist": left[:256],
                    "app": app_display,
                }

    if len(cleaned) <= 2:
        return None
    return {
        "title": cleaned[:256],
        "app": app_display,
    }


def get_music_info_from_windows() -> dict[str, Any] | None:
    for item in list_open_apps(limit=64, include_music=True):
        app_id = item.get("app_id", "")
        if not is_music_app_id(app_id):
            continue
        music = parse_music_window_title(app_id, item.get("window_title", ""))
        if music:
            return music
    return None


async def get_music_info() -> dict[str, Any] | None:
    for display_name, app_names in MUSIC_PLAYER_CANDIDATES:
        music = await asyncio.to_thread(get_scriptable_music_info, display_name, app_names)
        if music:
            return music
    return await asyncio.to_thread(get_music_info_from_windows)


def normalize_music_signature(music: dict[str, Any] | None) -> str:
    if not music or not music.get("title"):
        return ""
    return f"{music.get('app', '')}|{music.get('artist', '')}|{music.get('title', '')}"


def normalize_open_apps_signature(open_apps: list[dict[str, str]]) -> str:
    return "|".join(
        f"{item.get('app_id', '').lower()}:{item.get('window_title', '')}"
        for item in open_apps
    )


def format_music_label(music: dict[str, Any] | None) -> str:
    if not music or not music.get("title"):
        return ""
    title = str(music.get("title") or "").strip()
    artist = str(music.get("artist") or "").strip()
    return f"{artist} - {title}" if artist else title


def open_path(path: Path) -> None:
    if path == CONFIG_PATH:
        ensure_config_template()
    subprocess.Popen(["open", str(path)])


def show_error_dialog(message: str, title: str = "WatchMe Agent") -> None:
    script = f'display dialog {json.dumps(str(message))} with title {json.dumps(title)} buttons {{"OK"}} default button "OK"'
    try:
        run_osascript(script, timeout=10.0)
    except Exception:
        pass


def acquire_single_instance() -> Any | None:
    LOCK_PATH.parent.mkdir(parents=True, exist_ok=True)
    handle = LOCK_PATH.open("w")
    try:
        fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        handle.close()
        return None
    return handle


def release_single_instance(handle: Any | None) -> None:
    if handle is None:
        return
    try:
        fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
    finally:
        handle.close()


@dataclass
class Reporter:
    server_url: str
    token: str
    retry_delay_seconds: float = 0.0
    last_error: str | None = None

    def __post_init__(self) -> None:
        self.server_url = normalize_server_url(self.server_url)
        self._opener = self._build_opener()

    def _build_opener(self) -> Any:
        if is_loopback_server_url(self.server_url):
            return request.build_opener(request.ProxyHandler({}))
        return request.build_opener()

    @staticmethod
    def _format_http_error(prefix: str, exc: error.HTTPError) -> RuntimeError:
        details = ""
        try:
            body = exc.read().decode("utf-8", errors="replace").strip()
        except Exception:
            body = ""
        if body:
            details = f": {body[:200]}"
        return RuntimeError(f"{prefix} with HTTP {exc.code}{details}")

    def check_server_health(self) -> None:
        req = request.Request(
            f"{self.server_url.rstrip('/')}/api/health",
            headers={"Accept": "application/json"},
            method="GET",
        )
        try:
            with self._opener.open(req, timeout=5) as response:
                if not 200 <= response.status < 300:
                    raise RuntimeError(f"health check failed with HTTP {response.status}")
        except error.HTTPError as exc:
            raise self._format_http_error("health check failed", exc) from exc
        except error.URLError as exc:
            reason = exc.reason if hasattr(exc, "reason") else exc
            raise RuntimeError(f"health check failed: {reason}") from exc

    def check_device_auth(self) -> dict[str, Any]:
        req = request.Request(
            f"{self.server_url.rstrip('/')}/api/device",
            headers={
                "Accept": "application/json",
                "Authorization": f"Bearer {self.token}",
            },
            method="GET",
        )
        try:
            with self._opener.open(req, timeout=5) as response:
                if not 200 <= response.status < 300:
                    raise RuntimeError(f"device auth check failed with HTTP {response.status}")
                return json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            raise self._format_http_error("device auth check failed", exc) from exc
        except error.URLError as exc:
            reason = exc.reason if hasattr(exc, "reason") else exc
            raise RuntimeError(f"device auth check failed: {reason}") from exc

    def send(self, app_id: str, window_title: str, extra: dict[str, Any]) -> bool:
        payload = {
            "app_id": app_id[:128],
            "window_title": window_title[:256],
            "timestamp": utc_timestamp(),
            "extra": extra,
        }
        data = json.dumps(payload).encode("utf-8")
        req = request.Request(
            f"{self.server_url.rstrip('/')}/api/report",
            data=data,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with self._opener.open(req, timeout=10) as response:
                self.retry_delay_seconds = 0.0
                self.last_error = None
                return 200 <= response.status < 300
        except error.HTTPError as exc:
            self.last_error = str(self._format_http_error("report failed", exc))
        except error.URLError as exc:
            reason = exc.reason if hasattr(exc, "reason") else exc
            self.last_error = str(reason)
        except Exception as exc:  # pragma: no cover - defensive
            self.last_error = str(exc)

        self.retry_delay_seconds = 5.0 if self.retry_delay_seconds == 0 else min(self.retry_delay_seconds * 2, 60.0)
        log.warning("report failed: %s", self.last_error)
        return False


@dataclass
class RuntimeSnapshot:
    config_loaded: bool = False
    paused: bool = False
    current_app: str = "Starting"
    current_title: str = ""
    current_music: str = ""
    last_report_at: float | None = None
    last_error: str | None = None


class AgentRuntime:
    def __init__(self) -> None:
        self._snapshot = RuntimeSnapshot()
        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._pause_event = threading.Event()
        self._reload_event = threading.Event()
        self._reload_event.set()
        self._icon: Any = None
        self._last_user_error: str | None = None
        self._thread = threading.Thread(target=self._thread_main, name="watchme-monitor", daemon=True)

    def start(self) -> None:
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread.is_alive():
            self._thread.join(timeout=5)

    def bind_icon(self, icon: Any) -> None:
        self._icon = icon
        self._refresh_icon()

    def is_paused(self) -> bool:
        return self._pause_event.is_set()

    def toggle_pause(self) -> None:
        if self._pause_event.is_set():
            self._pause_event.clear()
            self._set_snapshot(paused=False, last_error=None)
            log.info("reporting resumed")
        else:
            self._pause_event.set()
            self._set_snapshot(paused=True, last_error=None)
            log.info("reporting paused")

    def request_reload(self) -> None:
        self._reload_event.set()
        self._set_snapshot(last_error=None)
        log.info("config reload requested")

    def open_config(self) -> None:
        open_path(CONFIG_PATH)

    def open_logs(self) -> None:
        open_path(LOG_DIR)

    def open_agent_folder(self) -> None:
        open_path(BASE_DIR)

    def tooltip(self) -> str:
        with self._lock:
            snapshot = RuntimeSnapshot(**self._snapshot.__dict__)

        state = "Paused" if snapshot.paused else ("Ready" if snapshot.config_loaded else "Needs config")
        parts = [f"WatchMe Agent - {state}", snapshot.current_app]

        if snapshot.current_music:
            parts.append(snapshot.current_music)
        elif snapshot.current_title:
            parts.append(snapshot.current_title[:48])

        if snapshot.last_error:
            parts.append(snapshot.last_error[:48])
        elif snapshot.last_report_at:
            parts.append(f"Last report {int(time.time() - snapshot.last_report_at)}s ago")

        return " | ".join(part for part in parts if part)

    def _thread_main(self) -> None:
        try:
            asyncio.run(self._monitor())
        except Exception as exc:  # pragma: no cover - top-level protection
            log.exception("fatal error: %s", exc)
            self._set_snapshot(last_error=str(exc), current_app="Stopped")
            self._notify_user_error(f"WatchMe Agent stopped unexpectedly.\n\n{exc}")

    async def _sleep(self, seconds: float) -> None:
        deadline = time.monotonic() + seconds
        while not self._stop_event.is_set():
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                return
            await asyncio.sleep(min(0.5, remaining))

    async def _monitor(self) -> None:
        reporter: Reporter | None = None
        previous_app = ""
        previous_title = ""
        previous_music_signature = ""
        previous_open_apps_signature = ""
        previous_idle = False
        last_report_time = 0.0
        interval = 5
        heartbeat_seconds = 60
        idle_threshold = 300

        log.info("monitoring started from %s", BASE_DIR)

        while not self._stop_event.is_set():
            if reporter is None or self._reload_event.is_set():
                try:
                    config = load_config()
                    reporter = Reporter(config["server_url"], config["token"])
                    reporter.check_server_health()
                    interval = max(2, int(config["interval_seconds"]))
                    heartbeat_seconds = max(interval, int(config["heartbeat_seconds"]))
                    idle_threshold = max(interval, int(config["idle_threshold_seconds"]))
                    previous_app = ""
                    previous_title = ""
                    previous_music_signature = ""
                    previous_open_apps_signature = ""
                    previous_idle = False
                    last_report_time = 0.0
                    self._reload_event.clear()
                    self._clear_user_error()
                    self._set_snapshot(config_loaded=True, current_app="Connected", current_title="", current_music="", last_error=None)
                except Exception as exc:
                    reporter = None
                    self._set_snapshot(config_loaded=False, current_app="Config required", last_error=str(exc))
                    self._notify_user_error(
                        "WatchMe Agent could not start reporting yet.\n\n"
                        f"{exc}\n\n"
                        "Open config.json, fix the value, then use 'Reload config' from the menu bar."
                    )
                    await self._sleep(5)
                    continue

            if self._pause_event.is_set():
                self._set_snapshot(paused=True, current_app="Paused")
                await self._sleep(1)
                continue

            self._set_snapshot(paused=False)

            now = time.time()
            idle_seconds = await asyncio.to_thread(get_idle_seconds)
            music = await get_music_info()
            audio_active = await asyncio.to_thread(is_audio_active)
            fullscreen = await asyncio.to_thread(is_front_window_fullscreen)
            is_idle = idle_seconds >= idle_threshold and not (music or audio_active or fullscreen)

            foreground = await asyncio.to_thread(get_foreground_info)
            open_apps = await asyncio.to_thread(list_open_apps)
            music_signature = normalize_music_signature(music)
            open_apps_signature = normalize_open_apps_signature(open_apps)
            music_label = format_music_label(music)

            if is_idle:
                app_id = "idle"
                title = "User is away"
            elif foreground:
                app_id, title = foreground
            else:
                app_id = previous_app or "unknown"
                title = previous_title

            heartbeat_due = now - last_report_time >= heartbeat_seconds
            focus_changed = app_id != previous_app or title != previous_title
            idle_changed = is_idle != previous_idle
            music_changed = music_signature != previous_music_signature
            open_apps_changed = open_apps_signature != previous_open_apps_signature

            if focus_changed or idle_changed or music_changed or open_apps_changed or heartbeat_due:
                extra = get_battery_extra()
                if open_apps:
                    extra["open_apps"] = open_apps
                if music:
                    extra["music"] = {key: value for key, value in music.items() if value}

                if reporter.send(app_id, title, extra):
                    if focus_changed or idle_changed:
                        log.info("reported foreground=%s title=%s idle=%s", app_id, title, is_idle)
                    elif music_changed and music:
                        log.info("reported music change=%s", music_label)

                    previous_app = app_id
                    previous_title = title
                    previous_music_signature = music_signature
                    previous_open_apps_signature = open_apps_signature
                    previous_idle = is_idle
                    last_report_time = now
                    self._set_snapshot(
                        config_loaded=True,
                        current_app=app_id,
                        current_title=title,
                        current_music=music_label,
                        last_report_at=now,
                        last_error=None,
                    )
                else:
                    self._set_snapshot(
                        config_loaded=True,
                        current_app=app_id,
                        current_title=title,
                        current_music=music_label,
                        last_error=reporter.last_error,
                    )
                    if reporter.retry_delay_seconds > 0:
                        await self._sleep(reporter.retry_delay_seconds)
                        continue
            else:
                self._set_snapshot(
                    config_loaded=True,
                    current_app=app_id,
                    current_title=title,
                    current_music=music_label,
                )

            await self._sleep(interval)

    def _set_snapshot(self, **changes: Any) -> None:
        with self._lock:
            for key, value in changes.items():
                setattr(self._snapshot, key, value)
        self._refresh_icon()

    def _refresh_icon(self) -> None:
        if self._icon is None:
            return
        try:
            self._icon.title = self.tooltip()
            self._icon.update_menu()
        except Exception:
            pass

    def _notify_user_error(self, message: str) -> None:
        should_show = False
        with self._lock:
            if self._last_user_error != message:
                self._last_user_error = message
                should_show = True

        if should_show:
            threading.Thread(target=show_error_dialog, args=(message,), name="watchme-alert", daemon=True).start()

    def _clear_user_error(self) -> None:
        with self._lock:
            self._last_user_error = None


def create_tray_icon() -> Any:
    if pystray is None or Image is None or ImageDraw is None:
        return None

    image = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((8, 8, 56, 56), radius=16, fill=(232, 160, 191, 255), outline=(255, 255, 255, 220), width=2)
    draw.ellipse((20, 24, 28, 32), fill=(255, 255, 255, 255))
    draw.ellipse((36, 24, 44, 32), fill=(255, 255, 255, 255))
    draw.arc((18, 24, 46, 44), start=20, end=160, fill=(255, 255, 255, 255), width=3)
    return image


def run_tray_app() -> int:
    if pystray is None:
        raise RuntimeError("pystray is not installed. Install requirements.txt or run in console mode.")

    runtime = AgentRuntime()

    def on_toggle_pause(icon: Any, _item: Any) -> None:
        runtime.toggle_pause()

    def on_reload(icon: Any, _item: Any) -> None:
        runtime.request_reload()

    def on_open_config(icon: Any, _item: Any) -> None:
        runtime.open_config()

    def on_open_logs(icon: Any, _item: Any) -> None:
        runtime.open_logs()

    def on_open_agent_folder(icon: Any, _item: Any) -> None:
        runtime.open_agent_folder()

    def on_quit(icon: Any, _item: Any) -> None:
        runtime.stop()
        icon.stop()

    icon = pystray.Icon(
        "watchme-agent",
        icon=create_tray_icon(),
        title="WatchMe Agent",
        menu=pystray.Menu(
            pystray.MenuItem("Pause reporting", on_toggle_pause, checked=lambda _item: runtime.is_paused()),
            pystray.MenuItem("Reload config", on_reload),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Open config.json", on_open_config),
            pystray.MenuItem("Open logs folder", on_open_logs),
            pystray.MenuItem("Open agent folder", on_open_agent_folder),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Quit", on_quit),
        ),
    )

    runtime.bind_icon(icon)
    runtime.start()
    icon.run()
    return 0


async def monitor_console() -> None:
    runtime = AgentRuntime()
    runtime.start()
    try:
        while True:
            await asyncio.sleep(1)
    finally:
        runtime.stop()


def main() -> int:
    instance_handle = acquire_single_instance()
    if instance_handle is None:
        log.info("another WatchMe agent instance is already running")
        return 0

    try:
        if pystray is not None:
            return run_tray_app()

        asyncio.run(monitor_console())
        return 0
    except KeyboardInterrupt:
        log.info("stopped")
        return 0
    except Exception as exc:
        log.exception("fatal error: %s", exc)
        show_error_dialog(f"WatchMe Agent exited with a fatal error.\n\n{exc}")
        return 1
    finally:
        release_single_instance(instance_handle)


if __name__ == "__main__":
    raise SystemExit(main())
