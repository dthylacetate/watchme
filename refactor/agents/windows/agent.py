from __future__ import annotations

import asyncio
import ctypes
import json
import logging
import os
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


BASE_DIR = Path(sys.executable).resolve().parent if getattr(sys, "frozen", False) else Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "config.json"
EXAMPLE_CONFIG_PATH = BASE_DIR / "config.example.json"
LOG_DIR = BASE_DIR / "logs"
LOG_PATH = LOG_DIR / "agent.log"
SINGLE_INSTANCE_NAME = "Local\\WatchMeAgentSingleton"
ERROR_ALREADY_EXISTS = 183
PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
PROCESS_QUERY_INFORMATION = 0x0400
PROCESS_VM_READ = 0x0010

LOG_DIR.mkdir(parents=True, exist_ok=True)
LOOPBACK_HOSTS = {"localhost", "127.0.0.1", "::1"}


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        RotatingFileHandler(LOG_PATH, encoding="utf-8", maxBytes=1_000_000, backupCount=5),
    ],
)
log = logging.getLogger("watchme-agent")


class LASTINPUTINFO(ctypes.Structure):
    _fields_ = [("cbSize", ctypes.c_uint), ("dwTime", ctypes.c_uint)]


class SYSTEM_POWER_STATUS(ctypes.Structure):
    _fields_ = [
        ("ACLineStatus", ctypes.c_byte),
        ("BatteryFlag", ctypes.c_byte),
        ("BatteryLifePercent", ctypes.c_byte),
        ("SystemStatusFlag", ctypes.c_byte),
        ("BatteryLifeTime", ctypes.c_uint),
        ("BatteryFullLifeTime", ctypes.c_uint),
    ]


user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32
psapi = ctypes.windll.psapi


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


def get_idle_seconds() -> float:
    info = LASTINPUTINFO()
    info.cbSize = ctypes.sizeof(LASTINPUTINFO)
    user32.GetLastInputInfo(ctypes.byref(info))
    tick_count = kernel32.GetTickCount()
    return max(0.0, (tick_count - info.dwTime) / 1000.0)


def get_foreground_window() -> int | None:
    hwnd = user32.GetForegroundWindow()
    return int(hwnd) or None


def get_window_title(hwnd: int) -> str:
    length = user32.GetWindowTextLengthW(hwnd)
    if length <= 0:
        return ""
    title_buffer = ctypes.create_unicode_buffer(length + 1)
    user32.GetWindowTextW(hwnd, title_buffer, length + 1)
    return title_buffer.value.strip()


def get_process_id_for_window(hwnd: int) -> int:
    process_id = ctypes.c_ulong()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(process_id))
    return int(process_id.value)


def get_process_name(process_id: int) -> str | None:
    handle = kernel32.OpenProcess(
        PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
        False,
        process_id,
    )
    if not handle:
        return None

    try:
        full_path_buffer = ctypes.create_unicode_buffer(1024)
        size = ctypes.c_ulong(len(full_path_buffer))
        if kernel32.QueryFullProcessImageNameW(handle, 0, full_path_buffer, ctypes.byref(size)):
            return Path(full_path_buffer.value).name or None

        base_buffer = ctypes.create_unicode_buffer(260)
        if psapi.GetModuleBaseNameW(handle, None, base_buffer, len(base_buffer)):
            return base_buffer.value or None
    finally:
        kernel32.CloseHandle(handle)

    return None


def get_foreground_info() -> tuple[str, str] | None:
    hwnd = get_foreground_window()
    if not hwnd:
        return None

    process_name = get_process_name(get_process_id_for_window(hwnd))
    if not process_name:
        return None

    return process_name, get_window_title(hwnd)


def list_open_apps(limit: int = 32) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    seen: set[str] = set()

    @ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
    def enum_window(hwnd: int, _lparam: int) -> bool:
        if not user32.IsWindowVisible(hwnd):
            return True

        title = get_window_title(hwnd)
        if not title:
            return True

        process_name = get_process_name(get_process_id_for_window(hwnd))
        if not process_name:
            return True

        key = process_name.lower()
        if key in seen:
            return True

        seen.add(key)
        items.append({
            "app_id": process_name,
            "window_title": title[:256],
        })
        return len(items) < limit

    user32.EnumWindows(enum_window, 0)
    return items


def get_battery_extra() -> dict[str, Any]:
    status = SYSTEM_POWER_STATUS()
    if not kernel32.GetSystemPowerStatus(ctypes.byref(status)):
        return {}

    percent = int(status.BatteryLifePercent)
    if percent < 0 or percent > 100:
        return {}

    return {
        "battery_percent": percent,
        "battery_charging": status.ACLineStatus == 1,
    }


async def get_music_info() -> dict[str, Any] | None:
    try:
        from winsdk.windows.media.control import GlobalSystemMediaTransportControlsSessionManager as MediaManager
    except Exception:
        return None

    try:
        manager = await MediaManager.request_async()
        session = manager.get_current_session()
        if session is None:
            return None

        media_properties = await session.try_get_media_properties_async()
        title = (media_properties.title or "").strip()
        if not title:
            return None

        artist = (media_properties.artist or "").strip()
        source = session.source_app_user_model_id or "Music"

        return {
            "title": title[:256],
            "artist": artist[:256] if artist else None,
            "app": source[:128],
        }
    except Exception:
        return None


def normalize_music_signature(music: dict[str, Any] | None) -> str:
    if not music or not music.get("title"):
        return ""
    return f"{music.get('app', '')}|{music.get('artist', '')}|{music.get('title', '')}"


def format_music_label(music: dict[str, Any] | None) -> str:
    if not music or not music.get("title"):
        return ""
    title = str(music.get("title") or "").strip()
    artist = str(music.get("artist") or "").strip()
    return f"{artist} - {title}" if artist else title


def open_path(path: Path) -> None:
    if path == CONFIG_PATH:
        ensure_config_template()
    os.startfile(str(path))


def show_error_dialog(message: str, title: str = "WatchMe Agent") -> None:
    try:
        user32.MessageBoxW(None, str(message), title, 0x10 | 0x1000)
    except Exception:
        pass


def acquire_single_instance() -> int | None:
    handle = kernel32.CreateMutexW(None, False, SINGLE_INSTANCE_NAME)
    if not handle:
        return None

    if kernel32.GetLastError() == ERROR_ALREADY_EXISTS:
        kernel32.CloseHandle(handle)
        return None

    return int(handle)


def release_single_instance(handle: int | None) -> None:
    if handle:
        kernel32.CloseHandle(handle)


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
        # The agent should always talk directly to the WatchMe server.
        # System HTTP proxies can turn local health checks into confusing 502s.
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
                        "Open config.json, fix the value, then use 'Reload config' from the tray."
                    )
                    await self._sleep(5)
                    continue

            if self._pause_event.is_set():
                self._set_snapshot(paused=True, current_app="Paused")
                await self._sleep(1)
                continue

            self._set_snapshot(paused=False)

            now = time.time()
            idle_seconds = get_idle_seconds()
            is_idle = idle_seconds >= idle_threshold

            foreground = get_foreground_info()
            music = await get_music_info()
            music_signature = normalize_music_signature(music)
            music_label = format_music_label(music)

            if is_idle:
                app_id = "idle"
                title = "User is away"
            elif foreground:
                app_id, title = foreground
            else:
                app_id = previous_app or "unknown.exe"
                title = previous_title

            heartbeat_due = now - last_report_time >= heartbeat_seconds
            focus_changed = app_id != previous_app or title != previous_title
            idle_changed = is_idle != previous_idle
            music_changed = music_signature != previous_music_signature

            if focus_changed or idle_changed or music_changed or heartbeat_due:
                extra = get_battery_extra()
                open_apps = list_open_apps()
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
        raise RuntimeError("pystray is not installed. Rebuild the agent with requirements.txt installed.")

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
