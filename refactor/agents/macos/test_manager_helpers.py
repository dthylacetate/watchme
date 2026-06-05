from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

import manager


class ManagerHelperTests(unittest.TestCase):
    def test_server_env_hint_uses_macos_platform(self) -> None:
        self.assertEqual(
            manager.build_server_env_hint("mac-token"),
            "DEVICE_TOKEN_1=mac-token:my-macbook:My MacBook:macos",
        )

    def test_server_env_hint_falls_back_to_placeholder(self) -> None:
        self.assertEqual(
            manager.build_server_env_hint(""),
            "DEVICE_TOKEN_1=your-agent-token:my-macbook:My MacBook:macos",
        )

    def test_save_config_normalizes_localhost(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            original_path = manager.CONFIG_PATH
            manager.CONFIG_PATH = Path(temp_dir) / "config.json"
            try:
                saved = manager.save_config_from_values(
                    {
                        "server_url": "http://localhost:3000/",
                        "token": "mac-token",
                        "interval_seconds": "5",
                        "heartbeat_seconds": "60",
                        "idle_threshold_seconds": "300",
                    }
                )
            finally:
                manager.CONFIG_PATH = original_path

        self.assertEqual(saved["server_url"], "http://127.0.0.1:3000")

    def test_worker_command_uses_python_source_by_default(self) -> None:
        command = manager.worker_command()
        self.assertGreaterEqual(len(command), 2)
        self.assertTrue(command[-1].endswith("agent.py"))

    def test_frozen_manager_uses_release_folder_as_base_dir(self) -> None:
        executable = "/Users/example/WatchMeAgent/WatchMeAgent.app/Contents/MacOS/WatchMeAgent"
        with mock.patch.object(manager.sys, "executable", executable), mock.patch.object(manager.sys, "frozen", True, create=True):
            self.assertEqual(manager.resolve_base_dir(), Path("/Users/example/WatchMeAgent"))

    def test_pid_running_handles_impossible_pid(self) -> None:
        self.assertFalse(manager.is_pid_running(-1))


if __name__ == "__main__":
    unittest.main()
