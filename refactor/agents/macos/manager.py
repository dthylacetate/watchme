from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
import tkinter as tk
from pathlib import Path
from tkinter import messagebox, ttk

import agent


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
WORKER_NAME = "WatchMeAgentWorker"
MANAGER_TITLE = "WatchMe Agent Manager"
STARTUP_LABEL = "com.watchme.agent"
PID_PATH = BASE_DIR / "watchme-agent-worker.pid"


def ensure_config_file() -> None:
    if not CONFIG_PATH.exists() and EXAMPLE_CONFIG_PATH.exists():
        CONFIG_PATH.write_text(EXAMPLE_CONFIG_PATH.read_text(encoding="utf-8"), encoding="utf-8")


def default_config() -> dict[str, object]:
    return {
        "server_url": "http://127.0.0.1:3000",
        "token": "",
        "interval_seconds": 5,
        "heartbeat_seconds": 60,
        "idle_threshold_seconds": 300,
    }


def load_config_for_ui() -> dict[str, object]:
    ensure_config_file()
    if not CONFIG_PATH.exists():
        return default_config()

    try:
        loaded = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception:
        return default_config()

    merged = default_config()
    merged.update(loaded)
    if merged.get("token") == "replace-with-device-token":
        merged["token"] = ""
    return merged


def save_config_from_values(values: dict[str, str]) -> dict[str, object]:
    data: dict[str, object] = {
        "server_url": agent.normalize_server_url(values["server_url"]),
        "token": values["token"].strip(),
        "interval_seconds": int(values["interval_seconds"]),
        "heartbeat_seconds": int(values["heartbeat_seconds"]),
        "idle_threshold_seconds": int(values["idle_threshold_seconds"]),
    }
    agent.validate_config(data)
    CONFIG_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return data


def build_server_env_hint(token: str, device_id: str = "my-macbook", display_name: str = "My MacBook") -> str:
    clean = token.strip() or "your-agent-token"
    return f"DEVICE_TOKEN_1={clean}:{device_id}:{display_name}:macos"


def worker_command() -> list[str]:
    bundled_worker = BASE_DIR / WORKER_NAME
    if bundled_worker.exists():
        return [str(bundled_worker)]

    bundled_app_worker = BASE_DIR / f"{WORKER_NAME}.app" / "Contents" / "MacOS" / WORKER_NAME
    if bundled_app_worker.exists():
        return [str(bundled_app_worker)]

    sibling_app_worker = BASE_DIR.parent.parent.parent / f"{WORKER_NAME}.app" / "Contents" / "MacOS" / WORKER_NAME
    if sibling_app_worker.exists():
        return [str(sibling_app_worker)]

    return [sys.executable, str(BASE_DIR / "agent.py")]


def is_pid_running(pid: int) -> bool:
    if pid <= 0:
        return False
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    return True


def worker_pid() -> int | None:
    if not PID_PATH.exists():
        return None
    try:
        pid = int(PID_PATH.read_text(encoding="utf-8").strip())
    except Exception:
        return None
    return pid if is_pid_running(pid) else None


def is_worker_running() -> bool:
    return worker_pid() is not None


def start_worker() -> None:
    if is_worker_running():
        return

    process = subprocess.Popen(
        worker_command(),
        cwd=str(BASE_DIR),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
        close_fds=True,
    )
    PID_PATH.write_text(str(process.pid), encoding="utf-8")


def stop_worker() -> None:
    pid = worker_pid()
    if pid is None:
        if PID_PATH.exists():
            PID_PATH.unlink()
        return

    try:
        os.kill(pid, signal.SIGTERM)
    except OSError:
        pass
    if PID_PATH.exists():
        PID_PATH.unlink()


def run_script(script_name: str, *extra_args: str) -> subprocess.CompletedProcess[str]:
    script_path = BASE_DIR / script_name
    if not script_path.exists():
        raise FileNotFoundError(f"Missing {script_name} in {BASE_DIR}")

    return subprocess.run(
        ["/bin/bash", str(script_path), *extra_args],
        capture_output=True,
        text=True,
        check=False,
        cwd=str(BASE_DIR),
    )


class AgentManagerApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title(MANAGER_TITLE)
        self.root.geometry("720x580")
        self.root.minsize(680, 540)

        config = load_config_for_ui()
        self.status_var = tk.StringVar(value="Ready")
        self.running_var = tk.StringVar(value="Running" if is_worker_running() else "Stopped")
        self.server_hint_var = tk.StringVar(value="")
        self.fields = {
            "server_url": tk.StringVar(value=str(config["server_url"])),
            "token": tk.StringVar(value=str(config["token"])),
            "interval_seconds": tk.StringVar(value=str(config["interval_seconds"])),
            "heartbeat_seconds": tk.StringVar(value=str(config["heartbeat_seconds"])),
            "idle_threshold_seconds": tk.StringVar(value=str(config["idle_threshold_seconds"])),
        }

        self._build_ui()
        self._refresh_server_hint()
        self._poll_worker_status()

    def _build_ui(self) -> None:
        frame = ttk.Frame(self.root, padding=16)
        frame.pack(fill="both", expand=True)
        frame.columnconfigure(1, weight=1)

        ttk.Label(frame, text="WatchMe Agent", font=("TkDefaultFont", 18, "bold")).grid(row=0, column=0, columnspan=3, sticky="w")
        ttk.Label(frame, text="macOS configuration, connection check, worker control, and startup setup.").grid(row=1, column=0, columnspan=3, sticky="w", pady=(2, 16))

        self._add_labeled_entry(frame, 2, "Server URL", "server_url")
        self._add_labeled_entry(frame, 3, "Agent Token", "token", show="*")
        self._add_labeled_entry(frame, 4, "Report Interval (s)", "interval_seconds")
        self._add_labeled_entry(frame, 5, "Heartbeat (s)", "heartbeat_seconds")
        self._add_labeled_entry(frame, 6, "Idle Threshold (s)", "idle_threshold_seconds")

        ttk.Separator(frame).grid(row=7, column=0, columnspan=3, sticky="ew", pady=14)

        button_row = ttk.Frame(frame)
        button_row.grid(row=8, column=0, columnspan=3, sticky="ew")
        for index in range(4):
            button_row.columnconfigure(index, weight=1)

        ttk.Button(button_row, text="Save Config", command=self.save_config).grid(row=0, column=0, sticky="ew", padx=(0, 8))
        ttk.Button(button_row, text="Test Connection", command=self.test_connection).grid(row=0, column=1, sticky="ew", padx=8)
        ttk.Button(button_row, text="Start Agent", command=self.start_agent).grid(row=0, column=2, sticky="ew", padx=8)
        ttk.Button(button_row, text="Stop Agent", command=self.stop_agent).grid(row=0, column=3, sticky="ew", padx=(8, 0))

        button_row_2 = ttk.Frame(frame)
        button_row_2.grid(row=9, column=0, columnspan=3, sticky="ew", pady=(10, 0))
        for index in range(4):
            button_row_2.columnconfigure(index, weight=1)

        ttk.Button(button_row_2, text="Enable Startup", command=self.enable_startup).grid(row=0, column=0, sticky="ew", padx=(0, 8))
        ttk.Button(button_row_2, text="Disable Startup", command=self.disable_startup).grid(row=0, column=1, sticky="ew", padx=8)
        ttk.Button(button_row_2, text="Open Logs", command=lambda: agent.open_path(agent.LOG_DIR)).grid(row=0, column=2, sticky="ew", padx=8)
        ttk.Button(button_row_2, text="Open Folder", command=lambda: agent.open_path(BASE_DIR)).grid(row=0, column=3, sticky="ew", padx=(8, 0))

        status_frame = ttk.LabelFrame(frame, text="Status", padding=12)
        status_frame.grid(row=10, column=0, columnspan=3, sticky="ew", pady=(16, 0))
        status_frame.columnconfigure(1, weight=1)
        ttk.Label(status_frame, text="Agent").grid(row=0, column=0, sticky="w")
        ttk.Label(status_frame, textvariable=self.running_var).grid(row=0, column=1, sticky="w")
        ttk.Label(status_frame, text="Last Action").grid(row=1, column=0, sticky="w", pady=(8, 0))
        ttk.Label(status_frame, textvariable=self.status_var, wraplength=560).grid(row=1, column=1, sticky="w", pady=(8, 0))

        help_frame = ttk.LabelFrame(frame, text="Server Setup Help", padding=12)
        help_frame.grid(row=11, column=0, columnspan=3, sticky="nsew", pady=(16, 0))
        frame.rowconfigure(11, weight=1)
        help_frame.columnconfigure(0, weight=1)

        help_text = (
            "1. On the server, add one DEVICE_TOKEN line for this Mac device.\n"
            "2. Server URL is the full site address, for example http://127.0.0.1:3000 or https://watchme.example.com.\n"
            "3. Agent Token is only the token prefix, not the whole DEVICE_TOKEN line.\n"
            "4. No server code change is required; this agent uses the existing WatchMe API."
        )
        ttk.Label(help_frame, text=help_text, justify="left", wraplength=650).grid(row=0, column=0, sticky="w")

        ttk.Label(help_frame, text="Example .env line for the server:", font=("TkDefaultFont", 10, "bold")).grid(row=1, column=0, sticky="w", pady=(14, 4))
        ttk.Entry(help_frame, textvariable=self.server_hint_var).grid(row=2, column=0, sticky="ew")

        for key in ("server_url", "token"):
            self.fields[key].trace_add("write", lambda *_args: self._refresh_server_hint())

    def _add_labeled_entry(self, parent: ttk.Frame, row: int, label: str, key: str, show: str | None = None) -> None:
        ttk.Label(parent, text=label).grid(row=row, column=0, sticky="w", pady=6)
        entry_kwargs = {"textvariable": self.fields[key]}
        if show is not None:
            entry_kwargs["show"] = show
        ttk.Entry(parent, **entry_kwargs).grid(row=row, column=1, columnspan=2, sticky="ew", pady=6)

    def _refresh_server_hint(self) -> None:
        self.server_hint_var.set(build_server_env_hint(self.fields["token"].get()))

    def _current_values(self) -> dict[str, str]:
        return {key: variable.get() for key, variable in self.fields.items()}

    def save_config(self) -> None:
        try:
            saved = save_config_from_values(self._current_values())
        except Exception as exc:
            messagebox.showerror(MANAGER_TITLE, str(exc))
            self.status_var.set(f"Save failed: {exc}")
            return

        self.fields["server_url"].set(str(saved["server_url"]))
        self.status_var.set(f"Saved {CONFIG_PATH.name}")

    def test_connection(self) -> None:
        try:
            config = save_config_from_values(self._current_values())
            self.fields["server_url"].set(str(config["server_url"]))
            reporter = agent.Reporter(str(config["server_url"]), str(config["token"]))
            reporter.check_server_health()
            device_info = reporter.check_device_auth()
        except Exception as exc:
            messagebox.showerror(MANAGER_TITLE, str(exc))
            self.status_var.set(f"Connection failed: {exc}")
            return

        device_name = str(device_info.get("device_name") or "Unknown device")
        platform = str(device_info.get("platform") or "unknown")
        self.status_var.set(f"Server auth check passed for {device_name}.")
        messagebox.showinfo(
            MANAGER_TITLE,
            "Server and token check passed.\n\n"
            f"Bound device: {device_name} ({platform})\n"
            "The URL is reachable, the token is valid, and the config was saved.",
        )

    def start_agent(self) -> None:
        try:
            saved = save_config_from_values(self._current_values())
            self.fields["server_url"].set(str(saved["server_url"]))
            start_worker()
        except Exception as exc:
            messagebox.showerror(MANAGER_TITLE, str(exc))
            self.status_var.set(f"Start failed: {exc}")
            return

        self.running_var.set("Running")
        self.status_var.set("Agent worker started.")

    def stop_agent(self) -> None:
        stop_worker()
        self.running_var.set("Stopped")
        self.status_var.set("Agent worker stopped.")

    def _poll_worker_status(self) -> None:
        self.running_var.set("Running" if is_worker_running() else "Stopped")
        self.root.after(2000, self._poll_worker_status)

    def enable_startup(self) -> None:
        try:
            result = run_script("install-startup.sh")
        except Exception as exc:
            messagebox.showerror(MANAGER_TITLE, str(exc))
            self.status_var.set(f"Enable startup failed: {exc}")
            return

        if result.returncode != 0:
            messagebox.showerror(MANAGER_TITLE, result.stderr.strip() or result.stdout.strip() or "Unknown error")
            self.status_var.set("Enable startup failed.")
            return

        self.status_var.set(f"Startup enabled for {STARTUP_LABEL}.")

    def disable_startup(self) -> None:
        try:
            result = run_script("uninstall-startup.sh")
        except Exception as exc:
            messagebox.showerror(MANAGER_TITLE, str(exc))
            self.status_var.set(f"Disable startup failed: {exc}")
            return

        if result.returncode != 0:
            messagebox.showerror(MANAGER_TITLE, result.stderr.strip() or result.stdout.strip() or "Unknown error")
            self.status_var.set("Disable startup failed.")
            return

        self.status_var.set(f"Startup disabled for {STARTUP_LABEL}.")


def run_manager() -> int:
    root = tk.Tk()
    AgentManagerApp(root)
    root.mainloop()
    return 0


def main() -> int:
    return run_manager()


if __name__ == "__main__":
    raise SystemExit(main())
