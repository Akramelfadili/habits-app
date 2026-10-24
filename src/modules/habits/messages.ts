/**
 * The message catalogue (HAB-48): every toast, banner and inline message the
 * module shows lives here, so wording, tone and timing are reviewed in one
 * place instead of being scattered across screens. New copy goes here; existing
 * strings move in as their screens are rebuilt in V3 (docs/feature-spec-v3.md).
 *
 * Rules (D12): toasts report events, banners describe states that last. Copy
 * names the habit, date or count — never "Success!" or "Oops". Never put raw
 * error text in a message; that goes to the log.
 */

export type MessageTone = "info" | "success" | "warning" | "error";

export type MessageSpec<Params extends readonly unknown[] = never[]> = {
	tone: MessageTone;
	/** Fixed copy, or copy built from what it names (habit, date, count). */
	text: string | ((...params: Params) => string);
	/**
	 * How long a toast stays, in ms. Omit for the tone's default
	 * (`defaultDurationMs`); `null` keeps it until the person dismisses it.
	 */
	durationMs?: number | null;
};

/** Default toast durations (HAB-48): Undo 5 s, success/info 4 s, warning 6 s, errors until Retry or swipe. */
export const UNDO_DURATION_MS = 5000;
const TONE_DURATION_MS: Record<MessageTone, number | null> = {
	info: 4000,
	success: 4000,
	warning: 6000,
	error: null,
};

/** How long `spec` stays on screen; a toast offering Undo always gets the Undo window. */
export function defaultDurationMs(
	spec: Pick<MessageSpec, "tone" | "durationMs">,
	{ hasUndo = false }: { hasUndo?: boolean } = {},
): number | null {
	if (spec.durationMs !== undefined) return spec.durationMs;
	if (hasUndo) return UNDO_DURATION_MS;
	return TONE_DURATION_MS[spec.tone];
}

/** The text of `spec`, with its params filled in. */
export function messageText<Params extends readonly unknown[]>(
	spec: MessageSpec<Params>,
	...params: Params
): string {
	return typeof spec.text === "string" ? spec.text : spec.text(...params);
}

/**
 * The catalogue. Empty until V3 screens start using it; entries look like
 * `freezeUsed: { tone: "success", text: (day: string, left: number) => … }`.
 */
export const messages = {} satisfies Record<
	string,
	// biome-ignore lint/suspicious/noExplicitAny: each entry declares its own params
	MessageSpec<any>
>;
