"""
System Design: Rate Limiting Algorithms
Implements core rate limiting algorithms commonly used in distributed systems & API Gateways:
1. Token Bucket (Industry standard - AWS, Stripe, Cloudflare)
2. Sliding Window Counter (Memory efficient, prevents boundary burst)
3. Fixed Window Counter (Simple, subject to boundary spikes)
"""

import time
import threading
from typing import Dict, Tuple, Optional

class TokenBucketRateLimiter:
    """
    Token Bucket Algorithm:
    - Tokens are added to the bucket at a constant refill rate (tokens/sec) up to capacity.
    - Each request consumes 1 token.
    - If tokens >= 1, request is allowed and token is decremented.
    - If tokens < 1, request is rejected (HTTP 429).
    - Allows burstiness up to `capacity` while enforcing an average rate of `refill_rate`.
    """
    def __init__(self, capacity: float = 5.0, refill_rate: float = 1.0):
        self.capacity = float(capacity)
        self.refill_rate = float(refill_rate)  # tokens per second
        self.buckets: Dict[str, Dict[str, float]] = {}
        self.lock = threading.Lock()

    def _get_current_tokens(self, key: str, now: float) -> Tuple[float, float]:
        if key not in self.buckets:
            self.buckets[key] = {
                "tokens": self.capacity,
                "last_refill": now
            }
            return self.capacity, now

        bucket = self.buckets[key]
        elapsed = now - bucket["last_refill"]
        # Add tokens accumulated since last check
        new_tokens = min(self.capacity, bucket["tokens"] + (elapsed * self.refill_rate))
        return new_tokens, bucket["last_refill"]

    def acquire(self, key: str = "default", cost: float = 1.0) -> Tuple[bool, float, float, float]:
        """
        Attempts to acquire `cost` tokens for `key`.
        Returns:
            (allowed: bool, remaining_tokens: float, retry_after: float, capacity: float)
        """
        with self.lock:
            now = time.time()
            current_tokens, last_refill = self._get_current_tokens(key, now)

            if current_tokens >= cost:
                current_tokens -= cost
                self.buckets[key] = {
                    "tokens": current_tokens,
                    "last_refill": now
                }
                retry_after = 0.0
                return True, round(current_tokens, 2), retry_after, self.capacity
            else:
                # Calculate how many seconds until at least 1 token is available
                needed = cost - current_tokens
                retry_after = round(needed / self.refill_rate, 2) if self.refill_rate > 0 else 999.0
                # Update bucket state to reflect refilled tokens even when rejected
                self.buckets[key] = {
                    "tokens": current_tokens,
                    "last_refill": now
                }
                return False, round(current_tokens, 2), retry_after, self.capacity

    def get_status(self, key: str = "default") -> Dict[str, float]:
        with self.lock:
            now = time.time()
            tokens, _ = self._get_current_tokens(key, now)
            return {
                "capacity": self.capacity,
                "refill_rate": self.refill_rate,
                "current_tokens": round(tokens, 2)
            }

    def reset(self, key: str = "default"):
        with self.lock:
            now = time.time()
            self.buckets[key] = {
                "tokens": self.capacity,
                "last_refill": now
            }

    def update_config(self, capacity: float, refill_rate: float):
        with self.lock:
            self.capacity = float(capacity)
            self.refill_rate = float(refill_rate)
            # Cap any existing bucket that exceeds new capacity
            for k in self.buckets:
                if self.buckets[k]["tokens"] > self.capacity:
                    self.buckets[k]["tokens"] = self.capacity


class FixedWindowRateLimiter:
    """
    Fixed Window Counter:
    - Divides time into fixed discrete windows (e.g. 10 seconds).
    - Counts requests in current window.
    - Resets counter at the start of each window.
    - Flaw: Traffic burst at boundary can allow 2x limit across window transitions.
    """
    def __init__(self, limit: int = 5, window_seconds: int = 10):
        self.limit = int(limit)
        self.window_seconds = int(window_seconds)
        self.windows: Dict[str, Dict[str, int]] = {}
        self.lock = threading.Lock()

    def acquire(self, key: str = "default") -> Tuple[bool, float, float, float]:
        with self.lock:
            now = time.time()
            window_id = int(now // self.window_seconds)
            window_end = (window_id + 1) * self.window_seconds

            client_data = self.windows.get(key, {"window_id": window_id, "count": 0})
            if client_data["window_id"] != window_id:
                client_data = {"window_id": window_id, "count": 0}

            if client_data["count"] < self.limit:
                client_data["count"] += 1
                self.windows[key] = client_data
                remaining = self.limit - client_data["count"]
                return True, float(remaining), 0.0, float(self.limit)
            else:
                retry_after = round(window_end - now, 2)
                return False, 0.0, retry_after, float(self.limit)

    def get_status(self, key: str = "default") -> Dict[str, float]:
        with self.lock:
            now = time.time()
            window_id = int(now // self.window_seconds)
            client_data = self.windows.get(key, {"window_id": window_id, "count": 0})
            count = client_data["count"] if client_data["window_id"] == window_id else 0
            return {
                "limit": float(self.limit),
                "window_seconds": float(self.window_seconds),
                "count": float(count),
                "remaining": float(max(0, self.limit - count))
            }

    def reset(self, key: str = "default"):
        with self.lock:
            if key in self.windows:
                del self.windows[key]

    def update_config(self, limit: int, window_seconds: int):
        with self.lock:
            self.limit = int(limit)
            self.window_seconds = int(window_seconds)


class SlidingWindowCounterRateLimiter:
    """
    Sliding Window Counter (Approximation):
    - Solves the boundary burst issue of Fixed Window with low memory footprint.
    - Computes estimated requests:
      estimated = prev_window_count * (1 - time_into_current / window_size) + current_window_count
    """
    def __init__(self, limit: int = 5, window_seconds: int = 10):
        self.limit = int(limit)
        self.window_seconds = int(window_seconds)
        self.counters: Dict[str, Dict[str, any]] = {}
        self.lock = threading.Lock()

    def acquire(self, key: str = "default") -> Tuple[bool, float, float, float]:
        with self.lock:
            now = time.time()
            current_window = int(now // self.window_seconds)
            time_into_current = now - (current_window * self.window_seconds)

            client = self.counters.get(key, {
                "curr_window": current_window,
                "curr_count": 0,
                "prev_count": 0
            })

            # Check if we moved past the current window
            if client["curr_window"] == current_window:
                curr_count = client["curr_count"]
                prev_count = client["prev_count"]
            elif client["curr_window"] == current_window - 1:
                # Advanced by 1 window: old current becomes previous
                prev_count = client["curr_count"]
                curr_count = 0
            else:
                # Advanced by >1 windows: everything resets
                prev_count = 0
                curr_count = 0

            # Weight factor for previous window
            weight = max(0.0, 1.0 - (time_into_current / self.window_seconds))
            estimated_count = (prev_count * weight) + curr_count

            if estimated_count < self.limit:
                curr_count += 1
                self.counters[key] = {
                    "curr_window": current_window,
                    "curr_count": curr_count,
                    "prev_count": prev_count
                }
                remaining = max(0.0, self.limit - (estimated_count + 1))
                return True, round(remaining, 2), 0.0, float(self.limit)
            else:
                retry_after = round(self.window_seconds - time_into_current, 2)
                return False, 0.0, retry_after, float(self.limit)

    def get_status(self, key: str = "default") -> Dict[str, float]:
        with self.lock:
            now = time.time()
            current_window = int(now // self.window_seconds)
            time_into_current = now - (current_window * self.window_seconds)
            client = self.counters.get(key, {
                "curr_window": current_window,
                "curr_count": 0,
                "prev_count": 0
            })
            if client["curr_window"] == current_window:
                curr_count = client["curr_count"]
                prev_count = client["prev_count"]
            elif client["curr_window"] == current_window - 1:
                prev_count = client["curr_count"]
                curr_count = 0
            else:
                prev_count = 0
                curr_count = 0

            weight = max(0.0, 1.0 - (time_into_current / self.window_seconds))
            estimated = (prev_count * weight) + curr_count
            return {
                "limit": float(self.limit),
                "window_seconds": float(self.window_seconds),
                "estimated_count": round(estimated, 2),
                "remaining": round(max(0.0, self.limit - estimated), 2)
            }

    def reset(self, key: str = "default"):
        with self.lock:
            if key in self.counters:
                del self.counters[key]

    def update_config(self, limit: int, window_seconds: int):
        with self.lock:
            self.limit = int(limit)
            self.window_seconds = int(window_seconds)
