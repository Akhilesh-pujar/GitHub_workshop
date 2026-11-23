/**
 * Rate Limiting Interactive Visualizer - Client Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // Client Identity (stored or generated)
  let clientId = localStorage.getItem('rate_limit_client_id');
  if (!clientId) {
    clientId = 'client_' + Math.random().toString(36).substring(2, 8);
    localStorage.setItem('rate_limit_client_id', clientId);
  }
  document.getElementById('client-id-display').textContent = clientId;

  // State
  let activeAlgorithm = 'token_bucket';
  let capacity = 5.0;
  let refillRate = 1.0;
  let currentTokens = 5.0;
  let windowLimit = 5;
  let windowSeconds = 10;
  let windowCount = 0;
  let windowElapsed = 0.0;

  let totalAllowed = 0;
  let totalBlocked = 0;
  let requestCounter = 0;
  let isSpamming = false;
  let spamIntervalId = null;

  // DOM Elements
  const valLastStatus = document.getElementById('val-last-status');
  const cardStatus = document.getElementById('card-status');
  const valRemaining = document.getElementById('val-remaining');
  const valLimitSub = document.getElementById('val-limit-sub');
  const valRetryAfter = document.getElementById('val-retry-after');
  const valAllowedCount = document.getElementById('val-allowed-count');
  const valBlockedCount = document.getElementById('val-blocked-count');

  const algorithmSelect = document.getElementById('algorithm-select');
  const tokenBucketView = document.getElementById('token-bucket-view');
  const windowView = document.getElementById('window-view');
  const bucketFill = document.getElementById('bucket-fill');
  const tokensLayer = document.getElementById('tokens-layer');
  const quotaPill = document.getElementById('quota-pill');
  const refillSpeedLabel = document.getElementById('refill-speed-label');
  const bucketBody = document.querySelector('.bucket-body');

  const windowTimeBar = document.getElementById('window-time-bar');
  const windowTimer = document.getElementById('window-timer');
  const windowTotal = document.getElementById('window-total');
  const windowCountVal = document.getElementById('window-count-val');
  const windowMaxVal = document.getElementById('window-max-val');
  const counterSlots = document.getElementById('counter-slots');
  const windowAlgorithmNote = document.getElementById('window-algorithm-note');

  const btnSendSingle = document.getElementById('btn-send-single');
  const btnSendBurst = document.getElementById('btn-send-burst');
  const btnToggleSpam = document.getElementById('btn-toggle-spam');
  const spamIcon = document.getElementById('spam-icon');
  const spamText = document.getElementById('spam-text');
  const spamIntervalInput = document.getElementById('spam-interval');
  const intervalDisplay = document.getElementById('interval-display');
  const btnReset = document.getElementById('btn-reset');

  const configFieldsToken = document.getElementById('config-fields-token');
  const configFieldsWindow = document.getElementById('config-fields-window');
  const inputCapacity = document.getElementById('input-capacity');
  const inputRefill = document.getElementById('input-refill');
  const inputLimit = document.getElementById('input-limit');
  const inputWindow = document.getElementById('input-window');
  const btnApplyConfig = document.getElementById('btn-apply-config');

  const inspStatus = document.getElementById('insp-status');
  const inspLimit = document.getElementById('insp-limit');
  const inspRemaining = document.getElementById('insp-remaining');
  const inspReset = document.getElementById('insp-reset');
  const inspRetry = document.getElementById('insp-retry');
  const inspAlgo = document.getElementById('insp-algo');

  const logTbody = document.getElementById('log-tbody');
  const btnClearLog = document.getElementById('btn-clear-log');

  // Educational Tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');
    });
  });

  // Slider change
  spamIntervalInput.addEventListener('input', (e) => {
    intervalDisplay.textContent = `${e.target.value}ms`;
    if (isSpamming) {
      restartSpam();
    }
  });

  // Algorithm Dropdown change
  algorithmSelect.addEventListener('change', async (e) => {
    activeAlgorithm = e.target.value;
    updateAlgorithmUI();
    await applyServerConfig();
  });

  function updateAlgorithmUI() {
    if (activeAlgorithm === 'token_bucket') {
      tokenBucketView.classList.add('active');
      windowView.classList.remove('active');
      configFieldsToken.classList.remove('hidden');
      configFieldsWindow.classList.add('hidden');
      valLimitSub.textContent = `/ ${capacity}`;
    } else {
      tokenBucketView.classList.remove('active');
      windowView.classList.add('active');
      configFieldsToken.classList.add('hidden');
      configFieldsWindow.classList.remove('hidden');
      valLimitSub.textContent = `/ ${windowLimit}`;
      windowTotal.textContent = `${windowSeconds}s`;
      windowMaxVal.textContent = windowLimit;

      if (activeAlgorithm === 'sliding_window') {
        windowAlgorithmNote.textContent = 'Sliding Window Counter: Dynamically calculates estimated request count using weighted previous window to prevent boundary bursts.';
      } else {
        windowAlgorithmNote.textContent = 'Fixed Window Counter: Vulnerable to boundary bursts (e.g. 5 requests at second 9.9 and 5 requests at second 10.1).';
      }
    }
  }

  // Render Token Coins
  function renderTokenCoins(count, max) {
    tokensLayer.innerHTML = '';
    const rounded = Math.floor(count);
    for (let i = 0; i < Math.min(rounded, 20); i++) {
      const coin = document.createElement('div');
      coin.className = 'token-coin';
      coin.textContent = '$';
      tokensLayer.appendChild(coin);
    }
  }

  // Render Window Slots
  function renderWindowSlots(count, max) {
    counterSlots.innerHTML = '';
    for (let i = 0; i < max; i++) {
      const slot = document.createElement('div');
      slot.className = 'slot-block';
      if (i < count) {
        slot.classList.add('filled');
        slot.textContent = '✓';
      } else {
        slot.textContent = i + 1;
      }
      counterSlots.appendChild(slot);
    }
  }

  // Sync / Fetch initial status
  async function fetchStatus() {
    try {
      const res = await fetch('/api/status', {
        headers: { 'X-Client-ID': clientId }
      });
      if (!res.ok) return;
      const data = await res.json();
      activeAlgorithm = data.active_algorithm;
      algorithmSelect.value = activeAlgorithm;

      if (activeAlgorithm === 'token_bucket') {
        capacity = data.state.capacity;
        refillRate = data.state.refill_rate;
        currentTokens = data.state.current_tokens;
        inputCapacity.value = capacity;
        inputRefill.value = refillRate;
      } else {
        windowLimit = data.state.limit;
        windowSeconds = data.state.window_seconds;
        inputLimit.value = windowLimit;
        inputWindow.value = windowSeconds;
      }
      updateAlgorithmUI();
      updateVisuals();
    } catch (err) {
      console.warn('Failed to fetch status:', err);
    }
  }

  // Update Visuals
  function updateVisuals() {
    if (activeAlgorithm === 'token_bucket') {
      const percent = Math.min(100, Math.max(0, (currentTokens / capacity) * 100));
      bucketFill.style.height = `${percent}%`;
      quotaPill.textContent = `${currentTokens.toFixed(1)} / ${capacity} Tokens Available`;
      refillSpeedLabel.textContent = `+${refillRate.toFixed(1)} token / sec refill`;
      valRemaining.textContent = currentTokens.toFixed(1);
      valLimitSub.textContent = `/ ${capacity}`;
      renderTokenCoins(currentTokens, capacity);
    } else {
      const remaining = Math.max(0, windowLimit - windowCount);
      valRemaining.textContent = remaining.toFixed(1);
      valLimitSub.textContent = `/ ${windowLimit}`;
      windowCountVal.textContent = windowCount.toFixed(1);
      renderWindowSlots(Math.floor(windowCount), windowLimit);
    }
  }

  // Local interpolation loop for silky smooth token refill
  let lastFrameTime = performance.now();
  function animationLoop(timestamp) {
    const deltaSeconds = (timestamp - lastFrameTime) / 1000;
    lastFrameTime = timestamp;

    if (activeAlgorithm === 'token_bucket') {
      if (currentTokens < capacity) {
        currentTokens = Math.min(capacity, currentTokens + (deltaSeconds * refillRate));
        updateVisuals();
      }
    } else {
      // Advance window timer
      const now = Date.now() / 1000;
      const windowId = Math.floor(now / windowSeconds);
      const elapsed = now - (windowId * windowSeconds);
      const progressPercent = (elapsed / windowSeconds) * 100;
      windowTimeBar.style.width = `${progressPercent}%`;
      windowTimer.textContent = `${elapsed.toFixed(1)}s`;
    }

    requestAnimationFrame(animationLoop);
  }
  requestAnimationFrame(animationLoop);

  // Send API Request
  async function sendApiRequest() {
    const startTime = performance.now();
    requestCounter++;
    const currentReqNum = requestCounter;

    try {
      const response = await fetch('/api/ping', {
        method: 'GET',
        headers: {
          'X-Client-ID': clientId
        }
      });

      const latencyMs = Math.round(performance.now() - startTime);
      const data = await response.json();

      // Extract Headers
      const hLimit = response.headers.get('X-RateLimit-Limit') || (data.limit || '-');
      const hRemaining = response.headers.get('X-RateLimit-Remaining') || (data.remaining !== undefined ? data.remaining : '-');
      const hReset = response.headers.get('X-RateLimit-Reset') || (data.retry_after || '-');
      const hRetry = response.headers.get('Retry-After') || (data.retry_after ? `${data.retry_after}s` : '0s');
      const hAlgo = response.headers.get('X-RateLimit-Algorithm') || activeAlgorithm;

      // Update Inspector
      inspStatus.innerHTML = response.status === 200
        ? `<span class="status-badge status-200">200 OK</span>`
        : `<span class="status-badge status-429">429 TOO MANY REQUESTS</span>`;
      inspLimit.textContent = hLimit;
      inspRemaining.textContent = hRemaining;
      inspReset.textContent = `${hReset}s`;
      inspRetry.textContent = hRetry;
      inspAlgo.textContent = hAlgo;

      valRetryAfter.textContent = `${hReset}s`;

      if (response.status === 200) {
        totalAllowed++;
        valAllowedCount.textContent = totalAllowed;
        valLastStatus.innerHTML = `<span class="text-green">200 OK</span>`;
        currentTokens = parseFloat(hRemaining) || 0;
        windowCount = (windowLimit - parseFloat(hRemaining)) || 0;
        addLogRow(currentReqNum, 200, hRemaining, `${latencyMs}ms`, 'Allowed (Within Quota)');
      } else {
        totalBlocked++;
        valBlockedCount.textContent = totalBlocked;
        valLastStatus.innerHTML = `<span class="text-red">429 BLOCKED</span>`;
        currentTokens = 0;
        windowCount = windowLimit;
        triggerRateLimitedAnimation();
        addLogRow(currentReqNum, 429, '0', `${latencyMs}ms`, `Rate Limited (Wait ${hReset}s)`);
      }

      updateVisuals();
    } catch (err) {
      console.error('Request failed:', err);
      valLastStatus.innerHTML = `<span class="text-amber">Error</span>`;
    }
  }

  // Rate Limited Red Shake Visual
  function triggerRateLimitedAnimation() {
    bucketBody.classList.remove('rate-limited');
    void bucketBody.offsetWidth; // trigger reflow
    bucketBody.classList.add('rate-limited');
    setTimeout(() => {
      bucketBody.classList.remove('rate-limited');
    }, 600);
  }

  // Add Log Entry
  function addLogRow(reqNum, status, remaining, latency, outcome) {
    const emptyRow = logTbody.querySelector('.empty-row');
    if (emptyRow) emptyRow.remove();

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>#${reqNum}</td>
      <td>${timeStr}</td>
      <td><span class="status-badge status-${status}">${status}</span></td>
      <td>${remaining}</td>
      <td>${latency}</td>
      <td class="${status === 200 ? 'text-green' : 'text-red'}">${outcome}</td>
    `;

    logTbody.insertBefore(tr, logTbody.firstChild);

    // Limit to 50 rows
    while (logTbody.children.length > 50) {
      logTbody.removeChild(logTbody.lastChild);
    }
  }

  // Burst Sending
  async function sendBurst(count = 5) {
    const promises = [];
    for (let i = 0; i < count; i++) {
      promises.push(sendApiRequest());
    }
    await Promise.all(promises);
  }

  // Spam Toggle
  function toggleSpam() {
    if (isSpamming) {
      stopSpam();
    } else {
      startSpam();
    }
  }

  function startSpam() {
    isSpamming = true;
    btnToggleSpam.classList.add('active-attacking');
    spamText.textContent = 'Stop Attack';
    spamIcon.textContent = '⏹️';
    const interval = parseInt(spamIntervalInput.value, 10) || 300;
    spamIntervalId = setInterval(sendApiRequest, interval);
  }

  function stopSpam() {
    isSpamming = false;
    btnToggleSpam.classList.remove('active-attacking');
    spamText.textContent = 'Auto Attack';
    spamIcon.textContent = '🔥';
    if (spamIntervalId) {
      clearInterval(spamIntervalId);
      spamIntervalId = null;
    }
  }

  function restartSpam() {
    if (spamIntervalId) clearInterval(spamIntervalId);
    const interval = parseInt(spamIntervalInput.value, 10) || 300;
    spamIntervalId = setInterval(sendApiRequest, interval);
  }

  // Apply Server Config
  async function applyServerConfig() {
    const body = {
      algorithm: activeAlgorithm,
      capacity: parseFloat(inputCapacity.value) || 5.0,
      refill_rate: parseFloat(inputRefill.value) || 1.0,
      limit: parseInt(inputLimit.value, 10) || 5,
      window_seconds: parseInt(inputWindow.value, 10) || 10
    };

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        await fetchStatus();
      }
    } catch (err) {
      console.error('Config update error:', err);
    }
  }

  // Reset Quota
  async function resetQuota() {
    try {
      await fetch('/api/reset', {
        method: 'POST',
        headers: { 'X-Client-ID': clientId }
      });
      await fetchStatus();
      valRetryAfter.textContent = '0.0s';
      inspRetry.textContent = '0s';
    } catch (err) {
      console.error('Reset error:', err);
    }
  }

  // Event Listeners
  btnSendSingle.addEventListener('click', () => sendApiRequest());
  btnSendBurst.addEventListener('click', () => sendBurst(5));
  btnToggleSpam.addEventListener('click', toggleSpam);
  btnReset.addEventListener('click', resetQuota);
  btnApplyConfig.addEventListener('click', applyServerConfig);

  btnClearLog.addEventListener('click', () => {
    logTbody.innerHTML = '<tr class="empty-row"><td colspan="6">Log cleared. Ready for new requests!</td></tr>';
  });

  // Initial load
  fetchStatus();
});
