from __future__ import annotations

import sys
import json
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest import mock

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

    def test_localhost_is_normalized_to_loopback_ip(self) -> None:
        self.assertEqual(
            agent.normalize_server_url("http://localhost:3000/"),
            "http://127.0.0.1:3000",
        )

    def test_loopback_urls_are_detected(self) -> None:
        self.assertTrue(agent.is_loopback_server_url("http://127.0.0.1:3000"))
        self.assertTrue(agent.is_loopback_server_url("http://localhost:3000"))
        self.assertFalse(agent.is_loopback_server_url("https://watchme.example.com"))

    def test_macos_app_id_is_stable(self) -> None:
        self.assertEqual(agent.normalize_macos_app_id("Visual Studio Code"), "visual studio code")
        self.assertEqual(agent.normalize_macos_app_id("Safari.app"), "safari")
        self.assertEqual(agent.normalize_macos_app_id("  Google   Chrome  "), "google chrome")

    def test_music_app_ids_cover_chinese_players(self) -> None:
        self.assertTrue(agent.is_music_app_id("QQ音乐"))
        self.assertTrue(agent.is_music_app_id("QQMusic"))
        self.assertTrue(agent.is_music_app_id("NetEase Cloud Music"))
        self.assertTrue(agent.is_music_app_id("网易云音乐"))
        self.assertFalse(agent.is_music_app_id("Safari"))

    def test_frozen_app_uses_release_folder_as_base_dir(self) -> None:
        executable = "/Users/example/WatchMeAgent/WatchMeAgentWorker.app/Contents/MacOS/WatchMeAgentWorker"
        with mock.patch.object(agent.sys, "executable", executable), mock.patch.object(agent.sys, "frozen", True, create=True):
            self.assertEqual(agent.resolve_base_dir(), Path("/Users/example/WatchMeAgent"))

    def test_open_apps_signature_changes_when_background_app_changes(self) -> None:
        base = [
            {"app_id": "visual studio code", "window_title": "README.md"},
            {"app_id": "safari", "window_title": "Docs"},
        ]
        changed = [
            {"app_id": "visual studio code", "window_title": "README.md"},
            {"app_id": "messages", "window_title": "Messages"},
        ]

        self.assertNotEqual(
            agent.normalize_open_apps_signature(base),
            agent.normalize_open_apps_signature(changed),
        )

    def test_list_open_apps_filters_music_by_default(self) -> None:
        output = "Safari\tDocs\nQQ音乐\t周杰伦 - 晴天\n网易云音乐\tMiles Davis - So What\n"
        with mock.patch.object(agent, "run_osascript", return_value=output):
            self.assertEqual(agent.list_open_apps(), [{"app_id": "safari", "window_title": "Docs"}])
            self.assertEqual(
                agent.list_open_apps(include_music=True),
                [
                    {"app_id": "safari", "window_title": "Docs"},
                    {"app_id": "qq音乐", "window_title": "周杰伦 - 晴天"},
                    {"app_id": "网易云音乐", "window_title": "Miles Davis - So What"},
                ],
            )


class MacOSParserTests(unittest.TestCase):
    def test_parse_ioreg_idle_seconds(self) -> None:
        output = '    | |   "HIDIdleTime" = 2500000000\n'
        self.assertEqual(agent.parse_ioreg_idle_seconds(output), 2.5)

    def test_parse_pmset_battery_charging(self) -> None:
        output = "Now drawing from 'AC Power'\n -InternalBattery-0 (id=1234567)\t87%; charging; 0:42 remaining present: true"
        self.assertEqual(
            agent.parse_pmset_battery(output),
            {"battery_percent": 87, "battery_charging": True},
        )

    def test_parse_pmset_battery_discharging(self) -> None:
        output = "Now drawing from 'Battery Power'\n -InternalBattery-0 (id=1234567)\t64%; discharging; 5:12 remaining present: true"
        self.assertEqual(
            agent.parse_pmset_battery(output),
            {"battery_percent": 64, "battery_charging": False},
        )

    def test_parse_pmset_without_battery(self) -> None:
        self.assertEqual(agent.parse_pmset_battery("Now drawing from 'AC Power'"), {})

    def test_parse_audio_assertions(self) -> None:
        output = """
Listed by owning process:
   pid 123(coreaudiod): [0x000000] 00:00:10 PreventUserIdleSystemSleep named: "com.apple.audio.context"
"""
        self.assertTrue(agent.parse_pmset_assertions_audio_active(output))

    def test_music_from_rows(self) -> None:
        self.assertEqual(
            agent.music_from_rows([["Spotify", "So What", "Miles Davis"]]),
            {"title": "So What", "artist": "Miles Davis", "app": "Spotify"},
        )

    def test_music_from_rows_requires_title(self) -> None:
        self.assertIsNone(agent.music_from_rows([["Spotify", "", "Miles Davis"]]))

    def test_parse_qq_music_window_title(self) -> None:
        self.assertEqual(
            agent.parse_music_window_title("QQ音乐", "周杰伦 - 晴天 - QQ音乐"),
            {"title": "晴天", "artist": "周杰伦", "app": "QQ音乐"},
        )

    def test_parse_netease_music_window_title(self) -> None:
        self.assertEqual(
            agent.parse_music_window_title("NetEase Cloud Music", "Miles Davis - So What"),
            {"title": "So What", "artist": "Miles Davis", "app": "网易云音乐"},
        )

    def test_music_window_title_ignores_plain_app_name(self) -> None:
        self.assertIsNone(agent.parse_music_window_title("QQMusic", "QQ音乐"))
        self.assertIsNone(agent.parse_music_window_title("Spotify", "Miles Davis - So What"))


class ReporterTests(unittest.TestCase):
    def test_reporter_checks_health_device_and_sends_report(self) -> None:
        received: dict[str, object] = {}

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, _format: str, *_args: object) -> None:
                return

            def do_GET(self) -> None:
                if self.path == "/api/health":
                    self.send_response(200)
                    self.end_headers()
                    self.wfile.write(b'{"status":"ok"}')
                    return

                if self.path == "/api/device":
                    received["auth"] = self.headers.get("Authorization")
                    self.send_response(200)
                    self.end_headers()
                    self.wfile.write(b'{"ok":true,"device_id":"macbook","device_name":"MacBook","platform":"macos"}')
                    return

                self.send_response(404)
                self.end_headers()

            def do_POST(self) -> None:
                if self.path != "/api/report":
                    self.send_response(404)
                    self.end_headers()
                    return

                length = int(self.headers.get("Content-Length", "0"))
                received["report_auth"] = self.headers.get("Authorization")
                received["report"] = json.loads(self.rfile.read(length).decode("utf-8"))
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b'{"ok":true}')

        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()

        try:
            reporter = agent.Reporter(f"http://127.0.0.1:{server.server_port}", "mac-token")
            reporter.check_server_health()
            self.assertEqual(reporter.check_device_auth()["platform"], "macos")
            self.assertTrue(reporter.send("safari", "WatchMe", {"battery_percent": 88}))
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)

        self.assertEqual(received["auth"], "Bearer mac-token")
        self.assertEqual(received["report_auth"], "Bearer mac-token")
        self.assertEqual(
            received["report"],
            {
                "app_id": "safari",
                "window_title": "WatchMe",
                "timestamp": received["report"]["timestamp"],
                "extra": {"battery_percent": 88},
            },
        )


if __name__ == "__main__":
    unittest.main()
