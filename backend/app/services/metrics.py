from __future__ import annotations

import time
from collections import Counter


class AppMetrics:
    def __init__(self) -> None:
        self.started_at = time.time()
        self.active_http_requests = 0
        self.total_http_requests = 0
        self.total_http_errors = 0
        self.http_statuses: Counter[str] = Counter()
        self.rate_limited_requests = 0
        self.realtime_connections_accepted = 0
        self.realtime_connections_rejected = 0

    def http_started(self) -> None:
        self.active_http_requests += 1

    def http_finished(self, status_code: int) -> None:
        self.active_http_requests = max(0, self.active_http_requests - 1)
        self.total_http_requests += 1
        self.http_statuses[str(status_code)] += 1
        if status_code >= 500:
            self.total_http_errors += 1

    def rate_limited(self) -> None:
        self.rate_limited_requests += 1

    def realtime_accepted(self) -> None:
        self.realtime_connections_accepted += 1

    def realtime_rejected(self) -> None:
        self.realtime_connections_rejected += 1

    def snapshot(self) -> dict[str, object]:
        return {
            "uptime_seconds": int(time.time() - self.started_at),
            "http": {
                "active": self.active_http_requests,
                "total": self.total_http_requests,
                "errors_5xx": self.total_http_errors,
                "rate_limited": self.rate_limited_requests,
                "statuses": dict(self.http_statuses),
            },
            "realtime": {
                "accepted": self.realtime_connections_accepted,
                "rejected": self.realtime_connections_rejected,
            },
        }


metrics = AppMetrics()
