"""
FastAPI Rate Limiting Application
Demonstrates Rate Limiting concepts with standard HTTP headers (X-RateLimit-*, Retry-After)
and interactive visualization.
"""

import os
from pathlib import Path
from fastapi import FastAPI, Request, Response, HTTPException, status
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from rate_limiter import (
    TokenBucketRateLimiter,
    FixedWindowRateLimiter,
    SlidingWindowCounterRateLimiter
)

app = FastAPI(
    title="System Design - Rate Limiting Demo",
    description="Interactive demonstration of Rate Limiting algorithms in distributed systems.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base directory for static files
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
STATIC_DIR.mkdir(exist_ok=True)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Rate Limiters Registry
limiters = {
    "token_bucket": TokenBucketRateLimiter(capacity=5.0, refill_rate=1.0),
    "sliding_window": SlidingWindowCounterRateLimiter(limit=5, window_seconds=10),
    "fixed_window": FixedWindowRateLimiter(limit=5, window_seconds=10),
}

# Current active algorithm
current_algorithm = "token_bucket"

class ConfigUpdate(BaseModel):
    algorithm: str = Field(..., description="token_bucket, sliding_window, or fixed_window")
    capacity: float = Field(5.0, ge=1.0, le=50.0)
    refill_rate: float = Field(1.0, ge=0.1, le=20.0)
    window_seconds: int = Field(10, ge=1, le=60)
    limit: int = Field(5, ge=1, le=50)

def get_client_id(request: Request) -> str:
    """Extracts client identity from header or client IP."""
    return request.headers.get("X-Client-ID") or (request.client.host if request.client else "127.0.0.1")

@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return HTMLResponse("<h1>Rate Limiting API</h1><p>Index file not found in /static.</p>")

@app.get("/api/ping")
async def rate_limited_ping(request: Request, response: Response):
    """
    Standard rate-limited test endpoint.
    Returns 200 OK if allowed, or 429 Too Many Requests when rate limit exceeded.
    Includes RFC & industry standard headers:
      - X-RateLimit-Limit
      - X-RateLimit-Remaining
      - X-RateLimit-Reset
      - Retry-After (on 429)
    """
    client_id = get_client_id(request)
    limiter = limiters.get(current_algorithm, limiters["token_bucket"])

    allowed, remaining, retry_after, limit_val = limiter.acquire(client_id)

    # Standard Rate Limiting Headers
    response_headers = {
        "X-RateLimit-Limit": str(int(limit_val)),
        "X-RateLimit-Remaining": str(remaining),
        "X-RateLimit-Algorithm": current_algorithm,
    }

    if not allowed:
        response_headers["Retry-After"] = str(retry_after)
        response_headers["X-RateLimit-Reset"] = str(retry_after)
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": "Too Many Requests",
                "message": f"Rate limit exceeded for client '{client_id}'. Please wait {retry_after}s before retrying.",
                "algorithm": current_algorithm,
                "retry_after": retry_after,
                "limit": limit_val,
                "remaining": remaining,
            },
            headers=response_headers
        )

    # Allowed response
    for k, v in response_headers.items():
        response.headers[k] = v

    return {
        "status": "success",
        "message": "Request processed successfully.",
        "client_id": client_id,
        "algorithm": current_algorithm,
        "remaining": remaining,
        "limit": limit_val,
        "retry_after": 0
    }

@app.get("/api/status")
async def get_limiter_status(request: Request):
    """Returns current state of active limiter and all available algorithms."""
    client_id = get_client_id(request)
    limiter = limiters.get(current_algorithm, limiters["token_bucket"])
    client_status = limiter.get_status(client_id)

    return {
        "active_algorithm": current_algorithm,
        "client_id": client_id,
        "state": client_status,
        "configs": {
            "token_bucket": {
                "capacity": limiters["token_bucket"].capacity,
                "refill_rate": limiters["token_bucket"].refill_rate
            },
            "sliding_window": {
                "limit": limiters["sliding_window"].limit,
                "window_seconds": limiters["sliding_window"].window_seconds
            },
            "fixed_window": {
                "limit": limiters["fixed_window"].limit,
                "window_seconds": limiters["fixed_window"].window_seconds
            }
        }
    }

@app.post("/api/config")
async def update_rate_limit_config(config: ConfigUpdate):
    """Dynamically adjust rate limiting parameters and algorithms."""
    global current_algorithm

    if config.algorithm not in limiters:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown algorithm '{config.algorithm}'. Available: {list(limiters.keys())}"
        )

    current_algorithm = config.algorithm

    # Update specific limiter settings
    if config.algorithm == "token_bucket":
        limiters["token_bucket"].update_config(config.capacity, config.refill_rate)
    elif config.algorithm in ("sliding_window", "fixed_window"):
        limiters[config.algorithm].update_config(config.limit, config.window_seconds)

    return {
        "status": "success",
        "message": f"Updated {current_algorithm} configuration.",
        "active_algorithm": current_algorithm
    }

@app.post("/api/reset")
async def reset_limits(request: Request):
    """Resets the rate limiter for the requesting client."""
    client_id = get_client_id(request)
    for limiter in limiters.values():
        limiter.reset(client_id)
    return {"status": "success", "message": f"Rate limits reset for client '{client_id}'."}

@app.get("/api/info")
async def get_system_design_info():
    """Returns system design theory & algorithm details for educational visualization."""
    return {
        "algorithms": [
            {
                "id": "token_bucket",
                "name": "Token Bucket",
                "burst_friendly": True,
                "memory": "O(1) per client",
                "pros": "Supports bursts, smooth average rate, widely used (AWS, Stripe).",
                "cons": "Refill rate & bucket capacity tuning required.",
                "formula": "tokens = min(capacity, current + elapsed * refill_rate)"
            },
            {
                "id": "sliding_window",
                "name": "Sliding Window Counter",
                "burst_friendly": False,
                "memory": "O(1) per client",
                "pros": "Solves boundary 2x burst issue, low memory overhead.",
                "cons": "Slight approximation of true sliding window log.",
                "formula": "count = prev_window * (1 - offset / window) + curr_window"
            },
            {
                "id": "fixed_window",
                "name": "Fixed Window Counter",
                "burst_friendly": False,
                "memory": "O(1) per client",
                "pros": "Simple to implement in Redis with INCR and EXPIRE.",
                "cons": "Traffic spikes at boundary can allow double the limit.",
                "formula": "count in floor(timestamp / window_size)"
            }
        ],
        "headers": [
            {"header": "X-RateLimit-Limit", "desc": "Maximum number of requests permitted in the current period."},
            {"header": "X-RateLimit-Remaining", "desc": "Number of remaining requests allowed before blocking."},
            {"header": "X-RateLimit-Reset", "desc": "Seconds remaining until current rate limit resets or next token refilled."},
            {"header": "Retry-After", "desc": "Standard HTTP 429 header indicating seconds client must wait."}
        ]
    }
