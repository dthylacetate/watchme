from __future__ import annotations

import json
import os
import subprocess
import sys
import tkinter as tk
from pathlib import Path
from tkinter import messagebox, ttk

import agent


BASE_DIR = Path(sys.executable).resolve().parent if getattr(sys, "frozen", False) else Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "config.json"
EXAMPLE_CONFIG_PATH = BASE_DIR / "config.example.json"
WORKER_EXE_NAME = "WatchMeAgentWorker.exe"
MANAGER_TITLE = "WatchMe Agent Manager"
STARTUP_TASK_NAME = "WatchMeAgent"


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


def build_server_env_hint(token: str, device_id: str = "my-desktop", display_name: str = "My Desktop") -> str:
    clean = token.strip() or "your-agent-token"
    return f"DEVICE_TOKEN_1={clean}:{device_id}:{display_name}:windows"


def is_worker_running() -> bool:
    result = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-Command",
            "Get-Process -Name 'WatchMeAgentWorker' -ErrorAction SilentlyContinue | Select-Object -First 1",
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    return result.returncode == 0 and "WatchMeAgentWorker" in result.stdout


def start_worker() -> None:
    worker_path = BASE_DIR / WORKER_EXE_NAME
    if not worker_path.exists():
        raise FileNotFoundError(f"Missing {WORKER_EXE_NAME} in {BASE_DIR}")
    if is_worker_running():
        return

    creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    subprocess.Popen(
        [str(worker_path)],
        cwd=str(BASE_DIR),
        creationflags=creationflags,
        close_fds=False,
    )


def stop_worker() -> None:
    subprocess.run(
        ["taskkill", "/IM", WORKER_EXE_NAME, "/F"],
        capture_output=True,
        text=True,
        check=False,
    )


def run_script(script_name: str, *extra_args: str) -> subprocess.CompletedProcess[str]:
    script_path = BASE_DIR / script_name
    if not script_path.exists():
        raise FileNotFoundError(f"Missing {script_name} in {BASE_DIR}")

    return subprocess.run(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(script_path), *extra_args],
        capture_output=True,
        text=True,
        check=False,
        cwd=str(BASE_DIR),
    )


class AgentManagerApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title(MANAGER_TITLE)
        self.root.geometry("700x560")
        self.root.minsize(680, 520)

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

    def _build_ui(self) -> None:
        frame = ttk.Frame(self.root, padding=16)
        frame.pack(fill="both", expand=True)
        frame.columnconfigure(1, weight=1)

        ttk.Label(frame, text="WatchMe Agent", font=("Segoe UI", 16, "bold")).grid(row=0, column=0, columnspan=3, sticky="w")
        ttk.Label(frame, text="把地址、token、启动和自启都收在这里。", foreground="#666").grid(row=1, column=0, columnspan=3, sticky="w", pady=(2, 16))

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
        ttk.Button(button_row_2, text="Open Logs", command=lambda: os.startfile(str(agent.LOG_DIR))).grid(row=0, column=2, sticky="ew", padx=8)
        ttk.Button(button_row_2, text="Open Folder", command=lambda: os.startfile(str(BASE_DIR))).grid(row=0, column=3, sticky="ew", padx=(8, 0))

        status_frame = ttk.LabelFrame(frame, text="Status", padding=12)
        status_frame.grid(row=10, column=0, columnspan=3, sticky="ew", pady=(16, 0))
        status_frame.columnconfigure(1, weight=1)
        ttk.Label(status_frame, text="Agent").grid(row=0, column=0, sticky="w")
        ttk.Label(status_frame, textvariable=self.running_var).grid(row=0, column=1, sticky="w")
        ttk.Label(status_frame, text="Last Action").grid(row=1, column=0, sticky="w", pady=(8, 0))
        ttk.Label(status_frame, textvariable=self.status_var, wraplength=520).grid(row=1, column=1, sticky="w", pady=(8, 0))

        help_frame = ttk.LabelFrame(frame, text="Server Setup Help", padding=12)
        help_frame.grid(row=11, column=0, columnspan=3, sticky="nsew", pady=(16, 0))
        frame.rowconfigure(11, weight=1)
        help_frame.columnconfigure(0, weight=1)

        help_text = (
            "1. On the server, edit .env and replace HASH_SECRET with a long random string.\n"
            "2. Add one DEVICE_TOKEN line for this Windows device.\n"
            "3. In this manager, Server URL is the full site address, for example:\n"
            "   http://127.0.0.1:3000  or  https://watchme.example.com\n"
            "4. In this manager, Agent Token is only the token prefix, not the whole DEVICE_TOKEN line."
        )
        ttk.Label(help_frame, text=help_text, justify="left", wraplength=620).grid(row=0, column=0, sticky="w")

        ttk.Label(help_frame, text="Example .env line for the server:", font=("Segoe UI", 9, "bold")).grid(row=1, column=0, sticky="w", pady=(14, 4))
        hint_entry = ttk.Entry(help_frame, textvariable=self.server_hint_var)
        hint_entry.grid(row=2, column=0, sticky="ew")

        ttk.Label(help_frame, text="The manager updates this example when you edit the token field.", foreground="#666").grid(row=3, column=0, sticky="w", pady=(6, 0))

        for key in ("server_url", "token"):
            self.fields[key].trace_add("write", lambda *_args: self._refresh_server_hint())

    def _add_labeled_entry(self, parent: ttk.Frame, row: int, label: str, key: str, show: str | None = None) -> None:
        ttk.Label(parent, text=label).grid(row=row, column=0, sticky="w", pady=6)
        entry_kwargs = {"textvariable": self.fields[key]}
        if show is not None:
            entry_kwargs["show"] = show
        entry = ttk.Entry(parent, **entry_kwargs)
        entry.grid(row=row, column=1, columnspan=2, sticky="ew", pady=6)

    def _refresh_server_hint(self) -> None:
        self.server_hint_var.set(build_server_env_hint(self.fields["token"].get()))

    def _current_values(self) -> dict[str, str]:
        return {key: variable.get() for key, variable in self.fields.items()}

    def save_config(self) -> None:
        try:
            save_config_from_values(self._current_values())
        except Exception as exc:
            messagebox.showerror(MANAGER_TITLE, str(exc))
            self.status_var.set(f"Save failed: {exc}")
            return

        self.fields["server_url"].set(str(load_config_for_ui()["server_url"]))
        self.status_var.set(f"Saved {CONFIG_PATH.name}")

    def test_connection(self) -> None:
        try:
            config = save_config_from_values(self._current_values())
            self.fields["server_url"].set(str(config["server_url"]))
            reporter = agent.Reporter(str(config["server_url"]), str(config["token"]))
            reporter.check_server_health()
        except Exception as exc:
            messagebox.showerror(MANAGER_TITLE, str(exc))
            self.status_var.set(f"Connection failed: {exc}")
            return

        self.status_var.set("Server health check passed.")
        messagebox.showinfo(MANAGER_TITLE, "Server health check passed.\n\nThe URL is reachable and the config was saved.")

    def start_agent(self) -> None:
        try:
            config = save_config_from_values(self._current_values())
            self.fields["server_url"].set(str(config["server_url"]))
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

    def enable_startup(self) -> None:
        try:
            worker_path = str(BASE_DIR / WORKER_EXE_NAME)
            result = run_script("install-startup.ps1", "-ExecutablePath", worker_path)
        except Exception as exc:
            messagebox.showerror(MANAGER_TITLE, str(exc))
            self.status_var.set(f"Enable startup failed: {exc}")
            return

        if result.returncode != 0:
            messagebox.showerror(MANAGER_TITLE, result.stderr.strip() or result.stdout.strip() or "Unknown error")
            self.status_var.set("Enable startup failed.")
            return

        self.status_var.set(f"Startup enabled for task {STARTUP_TASK_NAME}.")

    def disable_startup(self) -> None:
        try:
            result = run_script("uninstall-startup.ps1")
        except Exception as exc:
            messagebox.showerror(MANAGER_TITLE, str(exc))
            self.status_var.set(f"Disable startup failed: {exc}")
            return

        if result.returncode != 0:
            messagebox.showerror(MANAGER_TITLE, result.stderr.strip() or result.stdout.strip() or "Unknown error")
            self.status_var.set("Disable startup failed.")
            return

        self.status_var.set(f"Startup disabled for task {STARTUP_TASK_NAME}.")


def run_manager() -> int:
    root = tk.Tk()
    app = AgentManagerApp(root)
    app.root.mainloop()
    return 0


def main() -> int:
    return run_manager()


if __name__ == "__main__":
    raise SystemExit(main())
