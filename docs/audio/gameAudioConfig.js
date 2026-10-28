export const ICON_SFX = {
	hover: 'hoverIcon',
	click: 'clickIcon',
	exitToMenu: 'exitToMenu',
	exitTab: 'exitTab',
	cartridgeHover: 'hoverCartridge',
	cartridgeSelect: 'selectCartridge',
	enlargeScreenshot: 'enlargeScreenshot',
	returnScreenshot: 'returnScreenshot',
	screenshotScrollA: 'screenshotScrollA',
	screenshotScrollB: 'screenshotScrollB',
	grab: 'grabIcon',
	release: 'releaseIcon',
	spin: 'spinIcon',
	throw: 'throwIcon',
	wallHit: 'iconWallHit',
	hockeyHit: 'hockeyHit',
	breakTarget: 'breakTarget',
	countdown: 'countdown',
};

export const RING_SPIN_LOOP_KEY = 'ring-spin-loop';

export const SFX_ASSETS = {
	[ICON_SFX.hover]: './assets/audio/sounds/Hover_Icon.mp3',
	[ICON_SFX.click]: './assets/audio/sounds/Click_Icon.mp3',
	[ICON_SFX.exitToMenu]: './assets/audio/sounds/Exit.wav',
	[ICON_SFX.exitTab]: './assets/audio/sounds/Exit_Tab.wav',
	[ICON_SFX.cartridgeHover]: './assets/audio/sounds/Hover_Cartridge.wav',
	[ICON_SFX.cartridgeSelect]: './assets/audio/sounds/Select_Cartridge.wav',
	[ICON_SFX.enlargeScreenshot]: './assets/audio/sounds/Enlarge_Screenshot.wav',
	[ICON_SFX.returnScreenshot]: './assets/audio/sounds/Return_Screenshot.wav',
	[ICON_SFX.screenshotScrollA]: './assets/audio/sounds/Screenshot_Scroll.wav',
	[ICON_SFX.screenshotScrollB]: './assets/audio/sounds/Screenshot_Scroll2.wav',
	[ICON_SFX.grab]: './assets/audio/sounds/Grab_Icon.mp3',
	[ICON_SFX.release]: './assets/audio/sounds/Release_Icon.mp3',
	[ICON_SFX.spin]: './assets/audio/sounds/Spin_Icon.mp3',
	[ICON_SFX.throw]: './assets/audio/sounds/Throw_Icon.mp3',
	[ICON_SFX.wallHit]: './assets/audio/sounds/Icon_Hit_Wall.wav',
	[ICON_SFX.hockeyHit]: './assets/audio/sounds/Hockey_Hit.wav',
	[ICON_SFX.breakTarget]: './assets/audio/sounds/Break_Target.wav',
	[ICON_SFX.countdown]: './assets/audio/sounds/Countdown.wav',
};

export const MUSIC_TRACKS = {
	menu: 'menu',
	lab: 'lab',
	portfolio: 'portfolio',
	targetTest: 'targetTest',
};

export const MUSIC_ASSETS = {
	[MUSIC_TRACKS.menu]: { url: './assets/audio/music/Menu.mp3' },
	[MUSIC_TRACKS.lab]: { url: './assets/audio/music/The_Lab.mp3' },
	[MUSIC_TRACKS.portfolio]: { url: './assets/audio/music/Portfolio.mp3' },
	[MUSIC_TRACKS.targetTest]: { url: './assets/audio/music/Target_Test.mp3' },
};

export const MUSIC_VOLUME_STORAGE_KEY = 'mw_musicVolume';
export const SFX_VOLUME_STORAGE_KEY = 'mw_sfxVolume';

export function readStoredUiVolume(key, fallback = 1) {
	try {
		const raw = localStorage.getItem(key);
		if (raw == null || raw === '') return fallback;
		const parsed = Number(raw);
		if (!Number.isFinite(parsed)) return fallback;
		return Math.max(0, Math.min(1, parsed));
	} catch (_) {
		return fallback;
	}
}

export function writeStoredUiVolume(key, value) {
	try {
		localStorage.setItem(key, String(Math.max(0, Math.min(1, value))));
	} catch (_) {}
}
