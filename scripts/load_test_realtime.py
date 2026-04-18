from __future__ import annotations

import argparse
import asyncio
import json
import time
from pathlib import Path
from urllib.parse import urlencode

import websockets


async def hold_socket(base_url: str, token: str, hold_seconds: int, index: int, counters: dict[str, int]) -> None:
    url = f"{base_url}?{urlencode({'token': token})}"
    try:
        async with websockets.connect(url, ping_interval=None, close_timeout=3) as websocket:
            counters["connected"] += 1
            started_at = time.time()
            while time.time() - started_at < hold_seconds:
                await websocket.send(json.dumps({"event": "system:ping", "client_time": int(time.time() * 1000)}))
                await asyncio.wait_for(websocket.recv(), timeout=10)
                await asyncio.sleep(25)
    except Exception:
        counters["failed"] += 1
    finally:
        counters["finished"] += 1
        if index % 100 == 0:
            print(counters, flush=True)


async def run(args: argparse.Namespace) -> None:
    tokens = [line.strip() for line in Path(args.token_file).read_text(encoding="utf-8").splitlines() if line.strip()]
    if len(tokens) < args.users:
        raise SystemExit(f"Token file chi co {len(tokens)} token, can toi thieu {args.users} token rieng.")

    counters = {"connected": 0, "failed": 0, "finished": 0}
    tasks: list[asyncio.Task] = []
    delay = args.ramp_seconds / max(args.users, 1)
    for index, token in enumerate(tokens[: args.users], start=1):
        tasks.append(asyncio.create_task(hold_socket(args.url, token, args.hold_seconds, index, counters)))
        await asyncio.sleep(delay)

    await asyncio.gather(*tasks)
    print(counters)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Load test ket noi realtime WebSocket cua Vmora.")
    parser.add_argument("--url", default="ws://127.0.0.1:8000/api/v1/realtime/ws")
    parser.add_argument("--token-file", required=True, help="File moi dong la 1 access token cua 1 user rieng.")
    parser.add_argument("--users", type=int, default=1000)
    parser.add_argument("--ramp-seconds", type=int, default=120)
    parser.add_argument("--hold-seconds", type=int, default=300)
    return parser.parse_args()


if __name__ == "__main__":
    asyncio.run(run(parse_args()))
