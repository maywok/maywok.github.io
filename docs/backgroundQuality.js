export const BACKGROUND_QUALITY_MODE = Object.freeze({
  AUTO: 'auto',
  FULL: 'full',
  REDUCED: 'reduced',
});

const SESSION_MODE_KEY = 'mw_background_quality_mode_session';
const SESSION_REASON_KEY = 'mw_background_quality_reason_session';
const OVERRIDE_MODE_KEY = 'mw_background_quality_mode_override';

function normalizeRequestedMode(mode) {
  if (mode === BACKGROUND_QUALITY_MODE.FULL) return BACKGROUND_QUALITY_MODE.FULL;
  if (mode === BACKGROUND_QUALITY_MODE.REDUCED) return BACKGROUND_QUALITY_MODE.REDUCED;
  return BACKGROUND_QUALITY_MODE.AUTO;
}

function normalizeEffectiveMode(mode) {
  if (mode === BACKGROUND_QUALITY_MODE.FULL) return BACKGROUND_QUALITY_MODE.FULL;
  if (mode === BACKGROUND_QUALITY_MODE.REDUCED) return BACKGROUND_QUALITY_MODE.REDUCED;
  return null;
}

function readStorageMode(storage, key) {
  try {
    return normalizeEffectiveMode(storage?.getItem?.(key));
  } catch (_) {
    return null;
  }
}

function writeSessionState(mode, reason) {
  const normalized = normalizeEffectiveMode(mode);
  if (!normalized) return;
  try {
    sessionStorage.setItem(SESSION_MODE_KEY, normalized);
    if (typeof reason === 'string' && reason.length > 0) {
      sessionStorage.setItem(SESSION_REASON_KEY, reason);
    }
  } catch (_) {
  }
}

function readDeviceSignals() {
  const hasWindow = typeof window !== 'undefined';
  const hasNavigator = typeof navigator !== 'undefined';

  const prefersReducedMotion = Boolean(
    hasWindow
      && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  const hardwareConcurrency = hasNavigator && Number.isFinite(navigator.hardwareConcurrency)
    ? navigator.hardwareConcurrency
    : null;
  const deviceMemory = hasNavigator && Number.isFinite(navigator.deviceMemory)
    ? navigator.deviceMemory
    : null;

  const lowCoreCount = Number.isFinite(hardwareConcurrency) && hardwareConcurrency <= 4;
  const lowMemory = Number.isFinite(deviceMemory) && deviceMemory <= 4;
  const veryLowCoreCount = Number.isFinite(hardwareConcurrency) && hardwareConcurrency <= 2;
  const veryLowMemory = Number.isFinite(deviceMemory) && deviceMemory <= 2;

  const coarsePointer = Boolean(
    hasWindow
      && window.matchMedia
      && window.matchMedia('(pointer: coarse)').matches,
  );

  const smallViewport = Boolean(
    hasWindow
      && Number.isFinite(window.innerWidth)
      && Number.isFinite(window.innerHeight)
      && Math.min(window.innerWidth, window.innerHeight) > 0
      && Math.min(window.innerWidth, window.innerHeight) < 720,
  );

  const weakHintScore = [
    lowCoreCount,
    lowMemory,
    coarsePointer && smallViewport,
  ].filter(Boolean).length;

  // Treat memory-only reports as soft unless corroborated by low cores or multiple weak hints.
  const criticalWeakDevice = veryLowCoreCount || (veryLowMemory && (lowCoreCount || weakHintScore >= 2));

  return {
    prefersReducedMotion,
    hardwareConcurrency,
    deviceMemory,
    lowCoreCount,
    lowMemory,
    veryLowCoreCount,
    veryLowMemory,
    coarsePointer,
    smallViewport,
    weakHintScore,
    criticalWeakDevice,
  };
}

export function detectPreferredQuality(options = {}) {
  const requestedMode = normalizeRequestedMode(options.requestedMode);
  const signals = readDeviceSignals();

  if (requestedMode !== BACKGROUND_QUALITY_MODE.AUTO) {
    return {
      mode: requestedMode,
      requestedMode,
      reason: 'requested-mode',
      signals,
    };
  }

  const overrideMode = readStorageMode(localStorage, OVERRIDE_MODE_KEY);
  if (overrideMode) {
    return {
      mode: overrideMode,
      requestedMode,
      reason: 'manual-override',
      signals,
    };
  }

  const sessionMode = readStorageMode(sessionStorage, SESSION_MODE_KEY);
  let sessionReason = null;
  try {
    sessionReason = sessionStorage.getItem(SESSION_REASON_KEY);
  } catch (_) {
    sessionReason = null;
  }
  const stickyReducedReasons = new Set(['runtime-poor-performance', 'requested-mode', 'manual-override']);
  const shouldUseSessionMode = Boolean(
    sessionMode === BACKGROUND_QUALITY_MODE.FULL
      || (sessionMode === BACKGROUND_QUALITY_MODE.REDUCED && stickyReducedReasons.has(sessionReason)),
  );
  if (shouldUseSessionMode) {
    return {
      mode: sessionMode,
      requestedMode,
      reason: 'session-sticky',
      signals,
      sessionReason,
    };
  }

  if (signals.criticalWeakDevice) {
    return {
      mode: BACKGROUND_QUALITY_MODE.REDUCED,
      requestedMode,
      reason: 'critical-device-signals',
      signals,
    };
  }

  if (signals.prefersReducedMotion && signals.weakHintScore >= 2) {
    return {
      mode: BACKGROUND_QUALITY_MODE.REDUCED,
      requestedMode,
      reason: 'prefers-reduced-motion-weak-device',
      signals,
    };
  }

  if (signals.weakHintScore >= 2) {
    return {
      mode: BACKGROUND_QUALITY_MODE.FULL,
      requestedMode,
      reason: 'weak-hints-full-default',
      signals,
    };
  }

  if (signals.prefersReducedMotion) {
    return {
      mode: BACKGROUND_QUALITY_MODE.FULL,
      requestedMode,
      reason: 'prefers-reduced-motion-soft',
      signals,
    };
  }

  return {
    mode: BACKGROUND_QUALITY_MODE.FULL,
    requestedMode,
    reason: 'capable-default',
    signals,
  };
}

function percentile(values, p) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[idx];
}

export function measureStartupPerformance(ticker, options = {}) {
  const warmupSeconds = Number.isFinite(options.warmupSeconds) ? options.warmupSeconds : 0.9;
  const sampleWindowSeconds = Number.isFinite(options.sampleWindowSeconds) ? options.sampleWindowSeconds : 2.8;
  const minimumSamples = Number.isFinite(options.minimumSamples) ? options.minimumSamples : 90;
  const maximumSamples = Number.isFinite(options.maximumSamples) ? options.maximumSamples : 360;
  const poorAverageFps = Number.isFinite(options.poorAverageFps) ? options.poorAverageFps : 50;
  const poorP95FrameMs = Number.isFinite(options.poorP95FrameMs) ? options.poorP95FrameMs : 29;
  const requireBothPoorSignals = options.requireBothPoorSignals !== false;

  return new Promise((resolve) => {
    if (!ticker?.add || !ticker?.remove) {
      resolve({
        status: 'skipped',
        sampleCount: 0,
        averageFrameMs: 0,
        averageFps: 0,
        p95FrameMs: 0,
        isPoorPerformance: false,
      });
      return;
    }

    const frameMsSamples = [];
    let elapsedSeconds = 0;
    let sampledSeconds = 0;
    let finished = false;

    const stop = () => {
      try {
        ticker.remove(sampleFn);
      } catch (_) {
      }
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      stop();

      const sampleCount = frameMsSamples.length;
      const totalFrameMs = frameMsSamples.reduce((sum, value) => sum + value, 0);
      const averageFrameMs = sampleCount > 0 ? totalFrameMs / sampleCount : 0;
      const averageFps = averageFrameMs > 0 ? 1000 / averageFrameMs : 0;
      const p95FrameMs = percentile(frameMsSamples, 0.95);
      const enoughSamples = sampleCount >= minimumSamples;
      const failsAverage = averageFps < poorAverageFps;
      const failsTailLatency = p95FrameMs > poorP95FrameMs;
      const isPoorPerformance = Boolean(
        enoughSamples
          && (
            requireBothPoorSignals
              ? (failsAverage && failsTailLatency)
              : (failsAverage || failsTailLatency)
          ),
      );

      resolve({
        status: enoughSamples ? 'complete' : 'insufficient-samples',
        sampleCount,
        averageFrameMs,
        averageFps,
        p95FrameMs,
        failsAverage,
        failsTailLatency,
        isPoorPerformance,
      });
    };

    const sampleFn = (dt) => {
      const frameMs = Math.max(0.001, (Number.isFinite(dt) ? dt : 1) * (1000 / 60));
      const dtSeconds = frameMs / 1000;
      elapsedSeconds += dtSeconds;

      if (elapsedSeconds < warmupSeconds) {
        return;
      }

      frameMsSamples.push(frameMs);
      sampledSeconds += dtSeconds;

      if (frameMsSamples.length >= maximumSamples || sampledSeconds >= sampleWindowSeconds) {
        finish();
      }
    };

    ticker.add(sampleFn);
  });
}

export function createBackgroundQualityManager(options = {}) {
  let requestedMode = normalizeRequestedMode(options.requestedMode);
  const initialDecision = detectPreferredQuality({ requestedMode });
  let signals = initialDecision.signals || readDeviceSignals();

  let mode = initialDecision.mode;
  let reason = initialDecision.reason;
  let runtimeProbeStarted = false;
  let runtimeDecisionLocked = requestedMode !== BACKGROUND_QUALITY_MODE.AUTO || mode === BACKGROUND_QUALITY_MODE.REDUCED;

  const listeners = new Set();
  writeSessionState(mode, reason);

  function snapshot(extra = {}) {
    return {
      mode,
      requestedMode,
      reason,
      signals,
      ...extra,
    };
  }

  function notify(extra = {}) {
    const event = snapshot(extra);
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (_) {
      }
    }
  }

  function applyMode(nextMode, options = {}) {
    const normalized = normalizeEffectiveMode(nextMode);
    if (!normalized) return false;
    if (mode === normalized) return false;

    const allowUpgrade = Boolean(options.allowUpgrade);
    if (!allowUpgrade && mode === BACKGROUND_QUALITY_MODE.REDUCED && normalized === BACKGROUND_QUALITY_MODE.FULL) {
      return false;
    }

    mode = normalized;
    reason = options.reason || reason;
    writeSessionState(mode, reason);
    if (mode === BACKGROUND_QUALITY_MODE.REDUCED) {
      runtimeDecisionLocked = true;
    }

    notify({
      trigger: options.trigger || 'apply-mode',
    });

    return true;
  }

  function setRequestedMode(nextRequestedMode, options = {}) {
    requestedMode = normalizeRequestedMode(nextRequestedMode);

    const persistOverride = Boolean(options.persistOverride);
    if (persistOverride) {
      try {
        if (requestedMode === BACKGROUND_QUALITY_MODE.AUTO) {
          localStorage.removeItem(OVERRIDE_MODE_KEY);
        } else {
          localStorage.setItem(OVERRIDE_MODE_KEY, requestedMode);
        }
      } catch (_) {
      }
    }

    if (requestedMode === BACKGROUND_QUALITY_MODE.AUTO) {
      const nextDecision = detectPreferredQuality({ requestedMode });
      signals = nextDecision.signals || signals;
      reason = nextDecision.reason;
      runtimeDecisionLocked = nextDecision.mode === BACKGROUND_QUALITY_MODE.REDUCED;
      applyMode(nextDecision.mode, {
        allowUpgrade: true,
        reason: nextDecision.reason,
        trigger: 'requested-auto',
      });
      return;
    }

    runtimeDecisionLocked = true;
    applyMode(requestedMode, {
      allowUpgrade: true,
      reason: options.reason || 'requested-mode',
      trigger: 'requested-fixed',
    });
  }

  function onModeChange(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function maybeDowngradeFromPerformance(perfResult) {
    if (!perfResult?.isPoorPerformance) return false;
    if (requestedMode !== BACKGROUND_QUALITY_MODE.AUTO) return false;
    if (runtimeDecisionLocked) return false;
    if (mode !== BACKGROUND_QUALITY_MODE.FULL) return false;

    return applyMode(BACKGROUND_QUALITY_MODE.REDUCED, {
      reason: 'runtime-poor-performance',
      trigger: 'runtime-probe',
    });
  }

  function startRuntimeMonitoring(ticker, options = {}) {
    if (runtimeProbeStarted) return Promise.resolve(null);
    if (requestedMode !== BACKGROUND_QUALITY_MODE.AUTO) return Promise.resolve(null);
    if (mode !== BACKGROUND_QUALITY_MODE.FULL) return Promise.resolve(null);
    if (runtimeDecisionLocked) return Promise.resolve(null);

    runtimeProbeStarted = true;

    const weakHintScore = Number.isFinite(signals?.weakHintScore) ? signals.weakHintScore : 0;
    const calibratedOptions = {
      ...options,
      poorAverageFps: Number.isFinite(options.poorAverageFps)
        ? options.poorAverageFps
        : (weakHintScore >= 2 ? 53 : 50),
      poorP95FrameMs: Number.isFinite(options.poorP95FrameMs)
        ? options.poorP95FrameMs
        : (weakHintScore >= 2 ? 27 : 29),
    };

    return measureStartupPerformance(ticker, calibratedOptions).then((result) => {
      maybeDowngradeFromPerformance(result);
      runtimeDecisionLocked = true;
      return result;
    });
  }

  return {
    getMode: () => mode,
    getRequestedMode: () => requestedMode,
    getReason: () => reason,
    getState: () => snapshot(),
    setRequestedMode,
    applyBackgroundQuality: (nextMode, options = {}) => applyMode(nextMode, {
      allowUpgrade: Boolean(options.allowUpgrade),
      reason: options.reason || 'manual-apply',
      trigger: options.trigger || 'manual-apply',
    }),
    onModeChange,
    startRuntimeMonitoring,
  };
}
