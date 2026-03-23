let musicCtx = null;
let masterGain = null;
let activeTrack = null;
const loadedTracks = new Map();
const loadPromises = new Map();
let musicUiVolume = 1;
const MUSIC_GAIN_CAP = 0.30;

function clamp01(v) {
	if (!Number.isFinite(v)) return 1;
	return Math.max(0, Math.min(1, v));
}

function computeMusicGain(ui01) {
	return clamp01(ui01) * MUSIC_GAIN_CAP;
}

function getAudioContextClass() {
	return window.AudioContext || window.webkitAudioContext || null;
}

function canUseAudio() {
	return typeof window !== 'undefined' && Boolean(getAudioContextClass());
}

function ensureMasterGain(ctx) {
	if (masterGain) return masterGain;
	masterGain = ctx.createGain();
	masterGain.gain.value = computeMusicGain(musicUiVolume);
	masterGain.connect(ctx.destination);
	return masterGain;
}

function normalizeTrackDefinition(definition) {
	if (!definition) return null;
	if (typeof definition === 'string') {
		return { url: definition };
	}
	if (typeof definition === 'object' && typeof definition.url === 'string') {
		return {
			url: definition.url,
			loopStart: Number.isFinite(definition.loopStart) ? Math.max(0, definition.loopStart) : null,
			loopEnd: Number.isFinite(definition.loopEnd) ? Math.max(0, definition.loopEnd) : null,
		};
	}
	return null;
}

export async function initMusic() {
	if (!canUseAudio()) return null;
	if (!musicCtx) {
		const Ctx = getAudioContextClass();
		musicCtx = new Ctx();
		ensureMasterGain(musicCtx);
	}
	if (musicCtx.state === 'suspended') {
		try {
			await musicCtx.resume();
		} catch (_) {
			// Ignore resume failures; playback becomes available after next gesture.
		}
	}
	return musicCtx;
}

export async function loadMusic(trackMap = {}) {
	const ctx = await initMusic();
	if (!ctx) return {};
	const entries = Object.entries(trackMap || {});
	const tasks = entries.map(async ([id, definition]) => {
		const normalized = normalizeTrackDefinition(definition);
		if (!id || !normalized?.url) return;
		if (loadedTracks.has(id)) return;
		if (!loadPromises.has(id)) {
			loadPromises.set(id, (async () => {
				const res = await fetch(normalized.url);
				if (!res.ok) {
					throw new Error(`Failed to load music '${id}' from ${normalized.url}`);
				}
				const arr = await res.arrayBuffer();
				const buffer = await ctx.decodeAudioData(arr.slice(0));
				loadedTracks.set(id, {
					id,
					url: normalized.url,
					buffer,
					loopStart: normalized.loopStart,
					loopEnd: normalized.loopEnd,
				});
				return loadedTracks.get(id);
			})());
		}
		await loadPromises.get(id);
	});
	await Promise.all(tasks);
	return Object.fromEntries(entries.map(([id]) => [id, loadedTracks.get(id) || null]));
}

function buildTrackNodes(track) {
	if (!musicCtx || !track?.buffer) return null;
	const source = musicCtx.createBufferSource();
	const gain = musicCtx.createGain();
	source.buffer = track.buffer;
	source.loop = true;
	if (Number.isFinite(track.loopStart)) {
		source.loopStart = Math.max(0, track.loopStart);
	}
	if (Number.isFinite(track.loopEnd) && track.loopEnd > (source.loopStart || 0) + 0.01) {
		source.loopEnd = track.loopEnd;
	}
	source.connect(gain);
	gain.connect(ensureMasterGain(musicCtx));
	return { source, gain };
}

export async function setMusicTrack(trackId, options = {}) {
	if (!trackId) return false;
	const ctx = await initMusic();
	if (!ctx) return false;
	const track = loadedTracks.get(trackId);
	if (!track) return false;
	if (activeTrack?.id === trackId) return true;

	const crossfade = Number.isFinite(options.crossfade)
		? Math.max(0.05, options.crossfade)
		: 0.75;
	const next = buildTrackNodes(track);
	if (!next) return false;
	const now = ctx.currentTime;
	next.gain.gain.setValueAtTime(0, now);
	next.gain.gain.linearRampToValueAtTime(1, now + crossfade);
	next.source.start(now);

	if (activeTrack?.source && activeTrack?.gain) {
		const old = activeTrack;
		const oldGain = Math.max(0.0001, old.gain.gain.value);
		old.gain.gain.cancelScheduledValues(now);
		old.gain.gain.setValueAtTime(oldGain, now);
		old.gain.gain.exponentialRampToValueAtTime(0.0001, now + crossfade);
		old.source.stop(now + crossfade + 0.03);
		old.source.onended = () => {
			try {
				old.source.disconnect();
				old.gain.disconnect();
			} catch (_) {}
		};
	}

	activeTrack = {
		id: trackId,
		source: next.source,
		gain: next.gain,
	};
	return true;
}

export function getActiveMusicTrackId() {
	return activeTrack?.id || null;
}

export async function setMusicPaused(paused) {
	if (!musicCtx) return false;
	try {
		if (paused) {
			if (musicCtx.state === 'running') await musicCtx.suspend();
		} else if (musicCtx.state === 'suspended') {
			await musicCtx.resume();
		}
		return true;
	} catch (_) {
		return false;
	}
}

export function setMusicVolume(ui01) {
	musicUiVolume = clamp01(ui01);
	if (masterGain && musicCtx) {
		const now = musicCtx.currentTime;
		const target = computeMusicGain(musicUiVolume);
		masterGain.gain.cancelScheduledValues(now);
		masterGain.gain.setTargetAtTime(target, now, 0.03);
	}
	return musicUiVolume;
}

export function getMusicVolume() {
	return musicUiVolume;
}
