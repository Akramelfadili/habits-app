/**
 * OKLCH → sRGB hex conversion (CSS Color 4 reference matrices), used because
 * React Native's style engine doesn't understand oklch()/oklab() strings —
 * habit-accent colors in design-system.md are specified parametrically as
 * oklch(L C H), so they're computed here instead of hardcoded per hue.
 */
function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value));
}

function linearToSrgb(value: number): number {
	const v = clamp01(value);
	return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
}

function toHex(value: number): string {
	const byte = Math.round(clamp01(value) * 255);
	return byte.toString(16).padStart(2, "0");
}

/** L: 0–1, C: chroma (typically 0–0.4), H: hue in degrees. */
export function oklch(l: number, c: number, hDegrees: number): string {
	const h = (hDegrees * Math.PI) / 180;
	const a = c * Math.cos(h);
	const b = c * Math.sin(h);

	const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
	const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
	const s_ = l - 0.0894841775 * a - 1.291485548 * b;

	const lCubed = l_ ** 3;
	const mCubed = m_ ** 3;
	const sCubed = s_ ** 3;

	const r =
		4.0767416621 * lCubed - 3.3077115913 * mCubed + 0.2309699292 * sCubed;
	const g =
		-1.2684380046 * lCubed + 2.6097574011 * mCubed - 0.3413193965 * sCubed;
	const bl =
		-0.0041960863 * lCubed - 0.7034186147 * mCubed + 1.707614701 * sCubed;

	return `#${toHex(linearToSrgb(r))}${toHex(linearToSrgb(g))}${toHex(linearToSrgb(bl))}`;
}
