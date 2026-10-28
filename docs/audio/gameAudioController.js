import {
	initSfx,
	loadSfx,
	playSfx,
	startLoop as startSfxLoop,
	updateLoop as updateSfxLoop,
	stopLoop as stopSfxLoop,
	setSfxVolume,
} from './sfx.js';
import {
	initMusic,
	loadMusic,
	setMusicTrack,
	setMusicPaused,
	setMusicVolume,
} from './music.js';
import {
	ICON_SFX,
	RING_SPIN_LOOP_KEY,
	SFX_ASSETS,
	MUSIC_TRACKS,
	MUSIC_ASSETS,
	MUSIC_VOLUME_STORAGE_KEY,
	SFX_VOLUME_STORAGE_KEY,
	readStoredUiVolume,
	writeStoredUiVolume,
} from './gameAudioConfig.js';

export function createAudioController({ getSceneState }) {
	let musicUiVolume = readStoredUiVolume(MUSIC_VOLUME_STORAGE_KEY, 1);
	let sfxUiVolume = readStoredUiVolume(SFX_VOLUME_STORAGE_KEY, 1);
	setMusicVolume(musicUiVolume);
	setSfxVolume(sfxUiVolume);

	let sfxLoadWarned = false;
	let musicLoadWarned = false;
	let musicSwitchWarned = false;
	let musicUnlocked = false;
	let activeMusicTrack = null;
	let musicSwitchInFlight = false;
	let pendingMusicTrack = null;
	let activeScreenshotScrollSfx = Math.random() < 0.5 ? ICON_SFX.screenshotScrollA : ICON_SFX.screenshotScrollB;

	const sfxLoadPromise = loadSfx(SFX_ASSETS).catch((err) => {
		if (sfxLoadWarned) return;
		sfxLoadWarned = true;
		console.warn('SFX preload failed:', err);
	});
	const musicLoadPromise = loadMusic(MUSIC_ASSETS).catch((err) => {
		if (musicLoadWarned) return;
		musicLoadWarned = true;
		console.warn('Music preload failed:', err);
	});

	const resolveMusicTrack = () => {
		const state = getSceneState?.() || {};
		if (state.vineLabActive) return MUSIC_TRACKS.lab;
		if (state.livingRoomActive) return MUSIC_TRACKS.portfolio;
		if (state.tennisMode && state.dragEnabled) return MUSIC_TRACKS.targetTest;
		if (state.basketballMode && state.dragEnabled) return MUSIC_TRACKS.targetTest;
		return MUSIC_TRACKS.menu;
	};

	const syncMusicTrack = () => {
		if (!musicUnlocked) return;
		const nextTrack = resolveMusicTrack();
		pendingMusicTrack = nextTrack;
		if (pendingMusicTrack === activeMusicTrack) return;
		if (musicSwitchInFlight) return;
		musicSwitchInFlight = true;
		Promise.resolve(musicLoadPromise)
			.then(async () => {
				while (pendingMusicTrack && pendingMusicTrack !== activeMusicTrack) {
					const targetTrack = pendingMusicTrack;
					const ok = await setMusicTrack(targetTrack, { crossfade: 0.75 });
					if (!ok) {
						if (!musicSwitchWarned) {
							musicSwitchWarned = true;
							console.warn('Music switch failed: target track not ready', targetTrack);
						}
						pendingMusicTrack = null;
						break;
					}
					activeMusicTrack = targetTrack;
				}
			})
			.catch((err) => {
				if (musicSwitchWarned) return;
				musicSwitchWarned = true;
				console.warn('Music switch failed:', err);
			})
			.finally(() => {
				musicSwitchInFlight = false;
				if (!musicUnlocked) return;
				if (pendingMusicTrack && pendingMusicTrack !== activeMusicTrack) {
					syncMusicTrack();
				}
			});
	};

	const playSfxSafe = (id, options = {}) => {
		if (!id) return;
		try {
			playSfx(id, options);
		} catch (_) {}
	};

	const pickScreenshotScrollSfxForCartridge = () => {
		activeScreenshotScrollSfx = Math.random() < 0.5 ? ICON_SFX.screenshotScrollA : ICON_SFX.screenshotScrollB;
		return activeScreenshotScrollSfx;
	};

	const applyMusicUiVolume = (value, persist = true) => {
		musicUiVolume = Math.max(0, Math.min(1, value));
		setMusicVolume(musicUiVolume);
		if (persist) writeStoredUiVolume(MUSIC_VOLUME_STORAGE_KEY, musicUiVolume);
	};

	const applySfxUiVolume = (value, persist = true) => {
		sfxUiVolume = Math.max(0, Math.min(1, value));
		setSfxVolume(sfxUiVolume);
		if (persist) writeStoredUiVolume(SFX_VOLUME_STORAGE_KEY, sfxUiVolume);
	};

	return {
		ICON_SFX,
		RING_SPIN_LOOP_KEY,
		getMusicUiVolume: () => musicUiVolume,
		getSfxUiVolume: () => sfxUiVolume,
		primeSfxContext: () => {
			initSfx().catch(() => {});
			return sfxLoadPromise;
		},
		primeMusicContext: () => {
			musicUnlocked = true;
			initMusic().catch(() => {});
			return musicLoadPromise;
		},
		syncMusicTrack,
		setMusicPausedSafe: (paused) => setMusicPaused(paused).catch(() => {}),
		applyMusicUiVolume,
		applySfxUiVolume,
		playSfxSafe,
		playCartridgeHoverSfx: () => {
			playSfxSafe(ICON_SFX.cartridgeHover, {
				volume: 0.34 + Math.random() * 0.12,
				rate: 0.95 + Math.random() * 0.12,
			});
		},
		playCartridgeSelectSfx: () => {
			pickScreenshotScrollSfxForCartridge();
			playSfxSafe(ICON_SFX.cartridgeSelect, {
				volume: 0.54 + Math.random() * 0.16,
				rate: 0.93 + Math.random() * 0.14,
			});
		},
		playEnlargeScreenshotSfx: () => {
			playSfxSafe(ICON_SFX.enlargeScreenshot, {
				volume: 0.46 + Math.random() * 0.14,
				rate: 0.92 + Math.random() * 0.16,
			});
		},
		playReturnScreenshotSfx: () => {
			playSfxSafe(ICON_SFX.returnScreenshot, {
				volume: 0.4 + Math.random() * 0.16,
				rate: 0.9 + Math.random() * 0.16,
			});
		},
		playScreenshotScrollSfx: () => {
			playSfxSafe(activeScreenshotScrollSfx, {
				volume: 0.38 + Math.random() * 0.14,
				rate: 0.92 + Math.random() * 0.16,
			});
		},
		playExitToMenuSfx: () => {
			playSfxSafe(ICON_SFX.exitToMenu, {
				volume: 0.48 + Math.random() * 0.16,
				rate: 0.9 + Math.random() * 0.18,
			});
		},
		playExitTabSfx: () => {
			playSfxSafe(ICON_SFX.exitTab, {
				volume: 0.36 + Math.random() * 0.14,
				rate: 0.9 + Math.random() * 0.18,
			});
		},
		startSfxLoopSafe: (id, key, options = {}) => {
			if (!id || !key) return;
			try {
				startSfxLoop(id, key, options);
			} catch (_) {}
		},
		updateSfxLoopSafe: (key, options = {}) => {
			if (!key) return;
			try {
				updateSfxLoop(key, options);
			} catch (_) {}
		},
		stopSfxLoopSafe: (key, options = {}) => {
			if (!key) return;
			try {
				stopSfxLoop(key, options);
			} catch (_) {}
		},
	};
}
