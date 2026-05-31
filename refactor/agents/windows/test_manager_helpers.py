from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import manager


class ManagerHelperTests(unittest.TestCase):
    def test_server_env_hint_uses_token_prefix(self) -> None:
        self.assertEqual(
            manager.build_server_env_hint("desk-token"),
            "DEVICE_TOKEN_1=desk-token:my-desktop:My Desktop:windows",
        )

    def test_server_env_hint_falls_back_to_placeholder(self) -> None:
        self.assertEqual(
            manager.build_server_env_hint(""),
            "DEVICE_TOKEN_1=your-agent-token:my-desktop:My Desktop:windows",
        )

    def test_save_config_normalizes_localhost(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            original_path = manager.CONFIG_PATH
            manager.CONFIG_PATH = Path(temp_dir) / "config.json"
            try:
                saved = manager.save_config_from_values(
                    {
                        "server_url": "http://localhost:3000/",
                        "token": "desk-token",
                        "interval_seconds": "5",
                        "heartbeat_seconds": "60",
                        "idle_threshold_seconds": "300",
                    }
                )
            finally:
                manager.CONFIG_PATH = original_path

        self.assertEqual(saved["server_url"], "http://127.0.0.1:3000")


if __name__ == "__main__":
    unittest.main()
