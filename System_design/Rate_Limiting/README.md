# System Design: Rate Limiting Concept & Implementation

An interactive, visual demonstration of **Rate Limiting** in distributed systems built with **FastAPI** and **Vanilla HTML/CSS/JavaScript**.

---

## 📌 What is Rate Limiting?

**Rate Limiting** is a defensive architectural pattern used by API Gateways and web services to control the rate of traffic sent or received by a network interface or service.

### Primary Objectives in System Design:
1. **Prevent Denial of Service (DoS / DDoS) & Brute Force Attacks**: Protects authentication and heavy endpoints from being swamped.
2. **Prevent Cascading Failures**: Protects downstream microservices and databases from sudden traffic spikes.
3. **Fair Resource Allocation (Multi-tenancy)**: Prevents "noisy neighbors" from consuming all compute or network bandwidth.
4. **Cost & Quota Control**: Prevents excessive usage on paid third-party APIs (e.g., Stripe, Twilio, OpenAI).

---

## 🧠 Algorithms Implemented

| Algorithm | Burst Handling | Memory Complexity | Time Complexity | Real-world Example |
| :--- | :--- | :--- | :--- | :--- |
| **Token Bucket** *(Default)* | ✅ Excellent (up to capacity) | $O(1)$ per client | $O(1)$ | AWS API Gateway, Stripe, Cloudflare |
| **Sliding Window Counter** | ⚖️ Smooth | $O(1)$ per client | $O(1)$ | Kong, Envoy Gateway |
| **Fixed Window Counter** | ❌ Vulnerable to 2x boundary spike | $O(1)$ per client | $O(1)$ | Simple tier quotas (e.g. 1000 req/day) |

### 1. Token Bucket
- **Mechanism**: A bucket holds up to $C$ tokens. Tokens are continuously added at a refill rate $R$ (tokens/sec). Each request consumes 1 token.
- **Refill Formula (Lazy Evaluation)**:
  $$\text{tokens}_{\text{new}} = \min(C, \text{tokens}_{\text{old}} + (t_{\text{now}} - t_{\text{last}}) \times R)$$
- **Benefits**: Allows short bursts of traffic up to capacity while enforcing an average rate limit.

### 2. Fixed Window Counter
- **Mechanism**: Time is divided into fixed discrete intervals (e.g. 1-minute blocks). A counter increments per request.
- **Limitation (Boundary Burst Problem)**: A user can send all allowed requests at the end of window 1 (e.g. at 00:59) and another full quota at the start of window 2 (at 01:00), effectively sending **$2\times$ the rate limit** in a 2-second span.

### 3. Sliding Window Counter
- **Mechanism**: Smooths out boundary bursts by taking a weighted sum of the previous window and the current window:
  $$\text{Count} = \left(\text{Previous Count} \times \left(1 - \frac{t_{\text{elapsed}}}{W}\right)\right) + \text{Current Count}$$
- **Benefits**: Memory-efficient ($O(1)$) and avoids the boundary burst vulnerability of Fixed Window.

---

## 📡 HTTP Response Headers (Industry Standards)

When a client queries the API, the server returns standard rate limit headers:

| Header | Description |
| :--- | :--- |
| `X-RateLimit-Limit` | Maximum number of requests allowed in the period. |
| `X-RateLimit-Remaining` | Remaining requests available before rejection. |
| `X-RateLimit-Reset` | Time in seconds remaining until quota resets or next token refilled. |
| `Retry-After` | Returned on `HTTP 429 Too Many Requests` indicating how long the client must wait. |

---

## 🚀 Distributed Rate Limiting with Redis

In production clusters with multiple servers behind an API Gateway or Load Balancer, local in-memory storage cannot synchronize across instances.

### Architecture:
```
[Client] ──> [Load Balancer] ──> [FastAPI Server A / B / C] ──> [Central Redis Cluster]
```

### Redis Atomicity with Lua Script:
Using standard `GET` and `SET` commands introduces race conditions under concurrent requests. Redis executes Lua scripts **atomically**, eliminating race conditions without distributed locks:

```lua
local data = redis.call("HMGET", KEYS[1], "tokens", "last_refill")
local tokens = tonumber(data[1]) or tonumber(ARGV[1])
local last = tonumber(data[2]) or tonumber(ARGV[3])
local elapsed = math.max(0, tonumber(ARGV[3]) - last)

-- Refill tokens
tokens = math.min(tonumber(ARGV[1]), tokens + elapsed * tonumber(ARGV[2]))

if tokens >= tonumber(ARGV[4]) then
    tokens = tokens - tonumber(ARGV[4])
    redis.call("HMSET", KEYS[1], "tokens", tokens, "last_refill", ARGV[3])
    redis.call("EXPIRE", KEYS[1], 3600)
    return {1, tokens} -- ALLOWED
else
    redis.call("HMSET", KEYS[1], "tokens", tokens, "last_refill", ARGV[3])
    return {0, tokens} -- REJECTED (429)
end
```

---

## 💻 Running the Application

### 1. Requirements
Ensure Python 3.9+ is installed. Dependencies are in [requirements.txt](file:///d:/WEB_LAB/System_design/Rate_Limiting/requirements.txt):
```bash
pip install fastapi uvicorn
```

### 2. Start the Server
Navigate to the directory and run:
```bash
python -m uvicorn main:app --reload --port 8000
```

### 3. Open in Browser
Open your browser and navigate to:
```
http://127.0.0.1:8000
```

---

## 🧪 Interactive Dashboard Features

- **Dynamic Token Bucket Visualizer**: Watch liquid and coins fill dynamically as tokens refill over time.
- **Interactive Triggers**:
  - `Send Request`: Sends a single request to `/api/ping`.
  - `Burst (5x)`: Sends 5 simultaneous requests to test burst acceptance.
  - `Auto Attack`: Simulates high-frequency automated traffic spikes with an adjustable interval slider.
  - `Reset Quota`: Resets client quota to test fresh bursts.
- **HTTP Inspector**: Inspect `200 OK` vs `429 Too Many Requests`, and live headers (`X-RateLimit-*`, `Retry-After`).
- **Live Activity Log**: Displays request number, timestamp, latency, status code, and outcome in real time.
- **Educational System Design Tabs**: Detailed architecture diagrams, Lua scripts, and code explanations.
