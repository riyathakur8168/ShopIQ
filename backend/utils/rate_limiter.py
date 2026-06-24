"""
Lightweight in-memory rate limiter.
Suitable for single-process / single-worker deployments.
For multi-worker deployments (gunicorn), swap to flask-limiter with a Redis backend.
"""
import time
import threading
from functools import wraps
from flask import request, jsonify

_store: dict[str, list[float]] = {}
_lock = threading.Lock()


def _cleanup(ip: str, window: int) -> list[float]:
    """Remove timestamps outside the current window."""
    now = time.monotonic()
    return [t for t in _store.get(ip, []) if now - t < window]


def rate_limit(max_calls: int, window_seconds: int):
    """
    Decorator that limits requests per remote IP.

    Usage:
        @app.route('/api/auth/login', methods=['POST'])
        @rate_limit(max_calls=10, window_seconds=60)
        def login(): ...
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            ip = request.remote_addr or '0.0.0.0'
            key = f"{fn.__name__}:{ip}"
            now = time.monotonic()
            with _lock:
                timestamps = _cleanup(key, window_seconds)
                if len(timestamps) >= max_calls:
                    retry_after = int(window_seconds - (now - timestamps[0])) + 1
                    return jsonify({
                        'message': f'Too many requests. Please wait {retry_after} seconds before trying again.'
                    }), 429
                timestamps.append(now)
                _store[key] = timestamps
            return fn(*args, **kwargs)
        return wrapper
    return decorator
