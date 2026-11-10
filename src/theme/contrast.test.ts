import { semanticColors, surfaceColors } from "./theme";

/** WCAG 2.x relative luminance / contrast ratio for opaque #RRGGBB colours. */
function luminance(hex: string): number {
	const channel = (offset: number) => {
		const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
		return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
	const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (lighter + 0.05) / (darker + 0.05);
}

const TEXT_AA = 4.5;
const NON_TEXT_AA = 3;

describe.each(["light", "dark"] as const)(
	"%s theme contrast (WCAG AA)",
	(scheme) => {
		const surface = surfaceColors[scheme];
		const semantic = semanticColors[scheme];

		it("primary and secondary text clear 4.5:1 on every surface", () => {
			for (const ground of [surface.bg, surface.card, surface.inner]) {
				expect(contrast(surface.ink, ground)).toBeGreaterThanOrEqual(TEXT_AA);
				expect(contrast(surface.sub, ground)).toBeGreaterThanOrEqual(TEXT_AA);
			}
		});

		it("faint text (disabled chip, eyebrow labels, hints) clears 4.5:1 on every surface", () => {
			for (const ground of [surface.bg, surface.card, surface.inner]) {
				expect(contrast(surface.faint, ground)).toBeGreaterThanOrEqual(TEXT_AA);
			}
		});

		it("secondary text clears 4.5:1 on the frozen day's fill", () => {
			expect(contrast(surface.sub, semantic.frozenBg)).toBeGreaterThanOrEqual(
				TEXT_AA,
			);
		});

		it("warning text clears 4.5:1 on its tint and on the page, card and inner surface", () => {
			for (const ground of [
				semantic.warnTint,
				surface.bg,
				surface.card,
				surface.inner,
			]) {
				expect(contrast(semantic.warnInk, ground)).toBeGreaterThanOrEqual(
					TEXT_AA,
				);
			}
		});

		it("danger text (field errors, destructive rows) clears 4.5:1 on the page, card, inner surface and warning tint", () => {
			for (const ground of [
				surface.bg,
				surface.card,
				surface.inner,
				semantic.warnTint,
			]) {
				expect(contrast(semantic.dangerBg, ground)).toBeGreaterThanOrEqual(
					TEXT_AA,
				);
			}
		});

		it("text on the danger fill clears 4.5:1", () => {
			expect(
				contrast(surface.onAccent, semantic.dangerBg),
			).toBeGreaterThanOrEqual(TEXT_AA);
		});

		it("an unchecked control's outline clears 3:1 against the surfaces it sits on", () => {
			const grounds =
				scheme === "light"
					? [surface.card, surface.bg, surface.inner]
					: [surface.card, surface.inner];
			for (const ground of grounds) {
				expect(contrast(surface.outline, ground)).toBeGreaterThanOrEqual(
					NON_TEXT_AA,
				);
			}
		});

		it("text on the accent fill clears 4.5:1", () => {
			expect(contrast(surface.onAccent, surface.accent)).toBeGreaterThanOrEqual(
				TEXT_AA,
			);
		});

		// accent equals ink today; this guards the fill and focus ring if they ever diverge.
		it("the accent fill and the focus ring clear 3:1 against the page and card", () => {
			for (const ground of [surface.bg, surface.card, surface.inner]) {
				expect(contrast(surface.accent, ground)).toBeGreaterThanOrEqual(
					NON_TEXT_AA,
				);
			}
		});

		it("toast text clears 4.5:1 on the toast surface (10:1 per F-01)", () => {
			expect(contrast(surface.toastInk, surface.toast)).toBeGreaterThanOrEqual(
				10,
			);
		});

		it("freeze count text clears 4.5:1 on the page, card and inner surface", () => {
			for (const ground of [surface.bg, surface.card, surface.inner]) {
				expect(contrast(semantic.frozenInk, ground)).toBeGreaterThanOrEqual(
					TEXT_AA,
				);
			}
		});

		it("text on a frozen day uses ink, which clears 4.5:1 on frozenBg (T-15)", () => {
			expect(contrast(surface.ink, semantic.frozenBg)).toBeGreaterThanOrEqual(
				TEXT_AA,
			);
		});

		it("the frozen border clears 3:1 against its fill and the card", () => {
			for (const ground of [semantic.frozenBg, surface.card]) {
				expect(contrast(semantic.frozenInk, ground)).toBeGreaterThanOrEqual(
					NON_TEXT_AA,
				);
			}
		});

		it("keeps hairline borders decorative — they are not the control outline", () => {
			expect(surface.outline).not.toBe(surface.border);
			expect(contrast(surface.border, surface.card)).toBeLessThan(NON_TEXT_AA);
		});
	},
);
