from __future__ import annotations

import sys
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


if __name__ == "__main__":
    unittest.main()
