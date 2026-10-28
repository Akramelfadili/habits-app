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

import { showToast } from "@/store/toast-store";

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

/** " · Wed 21 Oct" when a toast is about a day that isn't today (HAB-30, T10), else nothing. */
const onDay = (day?: string) => (day ? ` · ${day}` : "");

/**
 * The catalogue. Today's toasts live here (V3-2a); the rest of the module's
 * strings move in as their screens are rebuilt. `day` is the date to name
 * ("Wed 21 Oct") and is omitted for today.
 */
export const messages = {
	completed: {
		tone: "success",
		text: (habit: string, day?: string) =>
			`Marked '${habit}' complete${onDay(day)}`,
	},
	resisted: {
		tone: "success",
		text: (habit: string, day?: string) => `Resisted '${habit}'${onDay(day)}`,
	},
	notCompleted: {
		tone: "info",
		text: (habit: string, day?: string) =>
			`Marked '${habit}' not complete${onDay(day)}`,
	},
	notResisted: {
		tone: "info",
		text: (habit: string, day?: string) =>
			`Marked '${habit}' not resisted${onDay(day)}`,
	},
	offSchedule: {
		tone: "success",
		text: (habit: string, day?: string) =>
			`Logged '${habit}' · off-schedule${onDay(day)}`,
	},
	/** D6: "Drink water +1 · 3 of 8 glasses". Above target it keeps counting: "9 of 8 glasses". */
	quantityAdded: {
		tone: "success",
		text: (
			habit: string,
			count: number,
			target: number,
			unit: string | null,
			day?: string,
		) =>
			`${habit} +1 · ${count} of ${target}${unit ? ` ${unit}` : ""}${onDay(day)}`,
	},
	/** T7: "Freeze used for Thu 22 · 0 left" — Undo takes it back. */
	freezeUsed: {
		tone: "success",
		text: (day: string, left: number) =>
			`Freeze used for ${day} · ${left} left`,
	},
	/** PR-11: logging a frozen day gives its freeze back. */
	freezeReturned: {
		tone: "success",
		text: (day: string, left: number) =>
			`Freeze returned for ${day} · ${left} left`,
	},
} satisfies Record<
	string,
	// biome-ignore lint/suspicious/noExplicitAny: each entry declares its own params
	MessageSpec<any>
>;

/**
 * Shows `spec` as the app's one toast, with an Undo when `undo` is given.
 * Copy and tone come from the catalogue, so a screen never writes its own.
 */
export function showMessage<Params extends readonly unknown[]>(
	spec: MessageSpec<Params>,
	params: Params,
	undo?: () => unknown,
): void {
	showToast({
		message: messageText(spec, ...params),
		tone: spec.tone === "error" ? "error" : "default",
		...(undo ? { actionLabel: "Undo", onAction: undo } : {}),
	});
}
