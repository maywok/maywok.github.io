let audioCtx = null;
const bufferCache = new Map();
const bufferUrlCache = new Map();
const loadPromises = new Map();
const activeLoops = new Map();
let masterGain = null;
let sfxUiVolume = 1;
const SFX_GAIN_CAP = 0.60;

function clamp01(v) {
	if (!Number.isFinite(v)) return 1;
	return Math.max(0, Math.min(1, v));
}

function computeSfxGain(ui01) {
	return clamp01(ui01) * SFX_GAIN_CAP;
}

function getAudioContextClass() {
	return window.AudioContext || window.webkitAudioContext || null;
}

function ensureMasterGain(ctx) {
	if (masterGain) return masterGain;
	masterGain = ctx.createGain();
	masterGain.gain.value = computeSfxGain(sfxUiVolume);
	masterGain.connect(ctx.destination);
	return masterGain;
}

function canUseWebAudio() {
	return typeof window !== 'undefined' && Boolean(getAudioContextClass());
}

export async function initSfx() {
	if (!canUseWebAudio()) return null;
	if (!audioCtx) {
		const Ctx = getAudioContextClass();
		audioCtx = new Ctx();
		ensureMasterGain(audioCtx);
	}
	if (audioCtx.state === 'suspended') {
		try {
			await audioCtx.resume();
		} catch (_) {
			// Ignore resume failures; playback calls are no-ops until resumed.
		}
	}
	return audioCtx;
}

export async function loadSfx(definitions = {}) {
	const ctx = await initSfx();
	if (!ctx) return {};
	const entries = Array.isArray(definitions)
		? definitions.map((entry) => [entry.id, entry.url])
		: Object.entries(definitions);
	const tasks = entries.map(async ([id, url]) => {
		if (!id || !url) return;
		const nextUrl = String(url);
		const cachedUrl = bufferUrlCache.get(id);
		if (bufferCache.has(id) && cachedUrl === nextUrl) return;
		if (cachedUrl !== nextUrl) {
			bufferCache.delete(id);
			loadPromises.delete(id);
			bufferUrlCache.delete(id);
		}
		if (!loadPromises.has(id)) {
			loadPromises.set(id, (async () => {
				try {
					const res = await fetch(nextUrl, { cache: 'no-store' });
					if (!res.ok) {
						throw new Error(`Failed to load SFX '${id}' from ${nextUrl}`);
					}
					const arr = await res.arrayBuffer();
					const decoded = await ctx.decodeAudioData(arr.slice(0));
					bufferCache.set(id, decoded);
					bufferUrlCache.set(id, nextUrl);
					return decoded;
				} finally {
					loadPromises.delete(id);
				}
			})());
		}
		await loadPromises.get(id);
	});
	await Promise.all(tasks);
	return Object.fromEntries(entries.map(([id]) => [id, bufferCache.get(id) || null]));
}

function getBuffer(id) {
	return bufferCache.get(id) || null;
}

function applySourceOptions(source, options = {}) {
	if (!source) return;
	const rate = Number.isFinite(options.rate) ? options.rate : 1;
	if (source.playbackRate) source.playbackRate.value = Math.max(0.05, rate);
	if (Number.isFinite(options.detune) && source.detune) {
		source.detune.value = options.detune;
	}
}

function applyGainOptions(gainNode, options = {}) {
	if (!gainNode || !audioCtx) return;
	const now = audioCtx.currentTime;
	const target = Number.isFinite(options.volume) ? Math.max(0, options.volume) : 1;
	if (Number.isFinite(options.fadeIn) && options.fadeIn > 0) {
		gainNode.gain.setValueAtTime(0, now);
		gainNode.gain.linearRampToValueAtTime(target, now + options.fadeIn);
	} else {
		gainNode.gain.setValueAtTime(target, now);
	}
}

function createSourceChain(id, options = {}) {
	if (!audioCtx) return null;
	const buffer = getBuffer(id);
	if (!buffer) return null;
	const source = audioCtx.createBufferSource();
	const gain = audioCtx.createGain();
	source.buffer = buffer;
	applySourceOptions(source, options);
	applyGainOptions(gain, options);
	source.connect(gain);
	gain.connect(ensureMasterGain(audioCtx));
	return { source, gain, buffer };
}

export function playSfx(id, options = {}) {
	if (!audioCtx) return null;
	const chain = createSourceChain(id, options);
	if (!chain) return null;
	const { source, gain, buffer } = chain;
	const when = Number.isFinite(options.when) ? Math.max(0, options.when) : 0;
	const offset = Number.isFinite(options.offset) ? Math.max(0, options.offset) : 0;
	let duration = Number.isFinite(options.duration) ? options.duration : null;
	if (duration != null) {
		duration = Math.max(0.01, Math.min(duration, Math.max(0.01, buffer.duration - offset)));
	}
	source.loop = false;
	source.onended = () => {
		try {
			source.disconnect();
			gain.disconnect();
		} catch (_) {}
	};
	if (duration != null) source.start(when, offset, duration);
	else source.start(when, offset);
	return source;
}

export function startLoop(id, key, options = {}) {
	if (!audioCtx || !key) return null;
	const existing = activeLoops.get(key);
	if (existing) {
		updateLoop(key, options);
		return existing;
	}
	const chain = createSourceChain(id, options);
	if (!chain) return null;
	const { source, gain } = chain;
	source.loop = true;
	source.start(0, Number.isFinite(options.offset) ? Math.max(0, options.offset) : 0);
	activeLoops.set(key, { id, source, gain });
	return activeLoops.get(key);
}

export function updateLoop(key, options = {}) {
	if (!audioCtx) return false;
	const loop = activeLoops.get(key);
	if (!loop) return false;
	const now = audioCtx.currentTime;
	if (Number.isFinite(options.volume)) {
		const nextVolume = Math.max(0, options.volume);
		loop.gain.gain.cancelScheduledValues(now);
		loop.gain.gain.setTargetAtTime(nextVolume, now, 0.05);
	}
	if (Number.isFinite(options.rate)) {
		loop.source.playbackRate.setTargetAtTime(Math.max(0.05, options.rate), now, 0.05);
	}
	if (Number.isFinite(options.detune) && loop.source.detune) {
		loop.source.detune.setTargetAtTime(options.detune, now, 0.05);
	}
	return true;
}

export function stopLoop(key, options = {}) {
	if (!audioCtx) return false;
	const loop = activeLoops.get(key);
	if (!loop) return false;
	const now = audioCtx.currentTime;
	const fadeOut = Number.isFinite(options.fadeOut) ? Math.max(0, options.fadeOut) : 0;
	if (fadeOut > 0) {
		const current = Math.max(0.0001, loop.gain.gain.value);
		loop.gain.gain.cancelScheduledValues(now);
		loop.gain.gain.setValueAtTime(current, now);
		loop.gain.gain.exponentialRampToValueAtTime(0.0001, now + fadeOut);
		loop.source.stop(now + fadeOut + 0.01);
	} else {
		loop.source.stop();
	}
	loop.source.onended = () => {
		try {
			loop.source.disconnect();
			loop.gain.disconnect();
		} catch (_) {}
	};
	activeLoops.delete(key);
	return true;
}

export function stopAllLoops(options = {}) {
	for (const key of activeLoops.keys()) {
		stopLoop(key, options);
	}
}

export function hasSfx(id) {
	return bufferCache.has(id);
}

export function setSfxVolume(ui01) {
	sfxUiVolume = clamp01(ui01);
	if (masterGain && audioCtx) {
		const now = audioCtx.currentTime;
		const target = computeSfxGain(sfxUiVolume);
		masterGain.gain.cancelScheduledValues(now);
		masterGain.gain.setTargetAtTime(target, now, 0.03);
	}
	return sfxUiVolume;
}

export function getSfxVolume() {
	return sfxUiVolume;
}
