from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import agent


class AgentConfigValidationTests(unittest.TestCase):
    def test_valid_config_passes(self) -> None:
        config = {
            "server_url": "https://watchme.example.com",
            "token": "my-token",
            "interval_seconds": 5,
            "heartbeat_seconds": 60,
            "idle_threshold_seconds": 300,
        }
        agent.validate_config(config)

    def test_placeholder_token_fails(self) -> None:
        config = {
            "server_url": "https://watchme.example.com",
            "token": "replace-with-device-token",
            "interval_seconds": 5,
            "heartbeat_seconds": 60,
            "idle_threshold_seconds": 300,
        }
        with self.assertRaisesRegex(ValueError, "placeholder"):
            agent.validate_config(config)

    def test_invalid_url_fails(self) -> None:
        config = {
            "server_url": "watchme.example.com",
            "token": "my-token",
            "interval_seconds": 5,
            "heartbeat_seconds": 60,
            "idle_threshold_seconds": 300,
        }
        with self.assertRaisesRegex(ValueError, "valid http/https URL"):
            agent.validate_config(config)


if __name__ == "__main__":
    unittest.main()
