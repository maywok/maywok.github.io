export const BASE_MOOD = {
	waveTint: 0xa31d4f,
	waveMix: 0.14,
	lampTint: 0xb8dbc9,
	glowStrength: 0.0,
	contrast: 0.0,
	vignette: 0.01,
	particleColor: 0x37223f,
	waveMotion: 1.0,
	lampBoost: 0.0,
};

export const MOOD_TRANSITION_SECONDS = 0.34;
export const HOVER_MOOD_DEBOUNCE_MS = 110;
export const MOOD_REENABLE_DELAY_MS = 200;

export const DRAG_MOOD = {
	...BASE_MOOD,
	waveMotion: 0.92,
	waveMix: 0.1,
	vignette: 0.008,
};

export const MOOD_MAP = {
	default: BASE_MOOD,
	GitHub: {
		waveTint: 0x5b5768,
		waveMix: 0.12,
		lampTint: 0xba9bc7,
		glowStrength: 0.06,
		contrast: 0.008,
		vignette: 0.03,
		particleColor: 0x4b334f,
		waveMotion: 1.03,
		lampBoost: 0.08,
	},
	LinkedIn: {
		waveTint: 0x2f5ea7,
		waveMix: 0.22,
		lampTint: 0x62bbff,
		glowStrength: 0.12,
		contrast: 0.02,
		vignette: 0.05,
		particleColor: 0x2b4f8b,
		waveMotion: 1.08,
		lampBoost: 0.16,
	},
	Blog: {
		waveTint: 0x4d8c60,
		waveMix: 0.2,
		lampTint: 0x82e79b,
		glowStrength: 0.1,
		contrast: 0.014,
		vignette: 0.045,
		particleColor: 0x3c6c4d,
		waveMotion: 1.06,
		lampBoost: 0.13,
	},
	Reflex: {
		waveTint: 0xd14c8d,
		waveMix: 0.24,
		lampTint: 0xff7f9d,
		glowStrength: 0.18,
		contrast: 0.024,
		vignette: 0.055,
		particleColor: 0x7a2f5d,
		waveMotion: 1.1,
		lampBoost: 0.2,
	},
	Resume: {
		waveTint: 0xc29661,
		waveMix: 0.16,
		lampTint: 0xf2c487,
		glowStrength: 0.1,
		contrast: 0.01,
		vignette: 0.038,
		particleColor: 0x7f6040,
		waveMotion: 1.04,
		lampBoost: 0.11,
	},
	Walklatro: {
		waveTint: 0xc6914b,
		waveMix: 0.17,
		lampTint: 0xf2c46f,
		glowStrength: 0.11,
		contrast: 0.014,
		vignette: 0.04,
		particleColor: 0x8a6137,
		waveMotion: 1.05,
		lampBoost: 0.12,
	},
	Portfolio: {
		waveTint: 0x2e5f85,
		waveMix: 0.2,
		lampTint: 0x83cbff,
		glowStrength: 0.1,
		contrast: 0.018,
		vignette: 0.045,
		particleColor: 0x2f4e6d,
		waveMotion: 1.06,
		lampBoost: 0.13,
	},
	Lab: {
		waveTint: 0x2b8675,
		waveMix: 0.21,
		lampTint: 0x38ffd0,
		glowStrength: 0.11,
		contrast: 0.019,
		vignette: 0.046,
		particleColor: 0x1d6657,
		waveMotion: 1.07,
		lampBoost: 0.14,
	},
};

export function getMoodProfile(key) {
	return MOOD_MAP[key] || MOOD_MAP.default;
}
