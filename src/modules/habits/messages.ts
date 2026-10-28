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

import { toastHoldMs } from "@/components/ui/composite/toast-host";
import { showToast, type ToastTone } from "@/store/toast-store";

export type MessageTone = ToastTone;

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

/** How long `spec` stays on screen (HAB-48): the host's hold for its tone, or the Undo window when it offers Undo. */
export function defaultDurationMs(
	spec: Pick<MessageSpec, "tone" | "durationMs">,
	{ hasUndo = false }: { hasUndo?: boolean } = {},
): number | null {
	if (spec.durationMs !== undefined) return spec.durationMs;
	return toastHoldMs({
		message: "",
		tone: spec.tone,
		actionLabel: hasUndo ? "Undo" : undefined,
	});
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
	/** RL2: a tap in Edit this day — "Read 20 min logged for Wed 21" — Undo targets that date. */
	dayLogged: {
		tone: "success",
		text: (habit: string, day: string) => `${habit} logged for ${day}`,
	},
	dayCleared: {
		tone: "info",
		text: (habit: string, day: string) => `${habit} cleared for ${day}`,
	},
	dayResisted: {
		tone: "success",
		text: (habit: string, day: string) => `${habit} resisted on ${day}`,
	},
	/** QS1: closing the quantity sheet after changes that neither cross the target nor cover a frozen day: "Drink water · 6 of 8 glasses". */
	quantitySet: {
		tone: "success",
		text: (
			habit: string,
			count: number,
			target: number,
			unit: string | null,
			day?: string,
		) =>
			`${habit} · ${count} of ${target}${unit ? ` ${unit}` : ""}${onDay(day)}`,
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
 * Inline Today copy (HAB-30–32): row status lines, group counts, the fold row,
 * the rest day and the empty state. Plain strings, not toasts, so they sit
 * beside the toast catalogue rather than inside it. No completion time ever
 * appears in a status line (spec: "Spec wins over the mockup").
 */
const plural = (count: number, one: string, many: string) =>
	`${count} ${count === 1 ? one : many}`;

export const todayCopy = {
	/** Week strip VoiceOver actions (08.3). */
	changeDayLabel: (day: string) => `${day} · Change day`,
	changeDayTitle: "Change day",
	previousWeek: "Previous week",
	nextWeek: "Next week",
	todayWord: "Today",
	nextDay: "Next day",
	previousDay: "Previous day",
	/** Streak at risk sheets (SR1/SR3, HAB-33). */
	atRiskTitle: (habit: string) => `Keep your ${habit} streak?`,
	atRiskTitleNone: "No freezes left this month",
	atRiskBody: (streak: number) =>
		`You missed yesterday. Use a freeze to keep your ${streak}-day streak, or let it go: it restarts with your next log.`,
	atRiskBodyNone: (streak: number, habit: string, resetsOn: string) =>
		`You missed yesterday, so your ${streak}-day streak for ${habit} restarts with your next log. Your longest streak is kept. Freezes come back on ${resetsOn}.`,
	atRiskUseFreeze: "Use a freeze",
	atRiskNotNow: "Not now",
	atRiskGotIt: "Got it",
	atRiskResetsOn: (date: string) => `Resets on ${date}`,
	/** The off-schedule picker (HAB-18). */
	pickerTitle: "Log off-schedule",
	pickerIntro:
		"Nothing is due today. Anything you log counts as a bonus — it can't break or extend a streak.",
	pickerEmptyTitle: "Nothing to log here",
	pickerEmptyBody:
		"Only habits you build can be logged off-schedule. Break habits and archived habits aren't listed.",
	pickerLogged: (habit: string) => `${habit}, logged off-schedule`,
	pickerLogQuantity: (habit: string) => `Log ${habit}, set an amount`,
	pickerLog: (habit: string) => `Log ${habit} off-schedule`,
	pickerAmount: "Amount",
	/** Edit this day (RL1–RL3, HAB-34). */
	editDayIntro:
		"Tap a circle to set that day. Streaks and rates update when you close.",
	editDayDone: "Done",
	editDayNoteLabel: "Note",
	editDayNotePlaceholder: "Add a note for this day",
	editDayNothingDue: "Nothing was due on this day.",
	editDayRowDone: "Done",
	editDayRowResisted: "Break · resisted",
	editDayRowMissed: "Missed · tap to log",
	editDayRowFrozen: "Frozen · logging it returns the freeze",
	editDayRowAmount: (value: number, target: number, unit: string | null) =>
		`${value} of ${target}${unit ? ` ${unit}` : ""} · tap for amount`,
	/** Quantity sheet (QS1–QS3). */
	quantityClose: "Close",
	quantityDone: "Done",
	quantityQuickAdd: "Quick add",
	quantityFill: (target: number) => `Fill to ${target}`,
	quantityExactTitle: "Set exact value",
	quantityExactBody: "Type how many",
	quantityExactLabel: (unit: string) =>
		unit ? `${unit} today` : "Amount today",
	quantityExactLabelOnDay: (unit: string, day: string) =>
		unit ? `${unit} on ${day}` : `Amount on ${day}`,
	quantityExactHelper: (target: number, max: number) =>
		`Target ${target} · up to ${max}`,
	quantitySetTo: (value: number) => `Set to ${value}`,
	quantityAutosave:
		"Every change saves straight away. Closing shows one toast with Undo.",
	quantityAtTarget: (unit: string) =>
		`Target reached — the circle is full. Extra ${unit || "amounts"} still count.`,
	quantityOf: (target: number, unit: string, done: boolean) =>
		`of ${target}${unit ? ` ${unit}` : ""}${done ? " · done" : ""}`,
	quantityTitleOnDay: (name: string, day: string) => `${name} · ${day}`,
	screenTitle: "Today",
	addHabit: "Add habit",
	rowStreak: (days: number) => `${days}-day streak`,
	rowResisting: (days: number) =>
		days > 0
			? `Resisting · ${plural(days, "day", "days")} strong`
			: "Resisting",
	rowResisted: (days: number, isToday: boolean) => {
		const base = isToday ? "Resisted today" : "Resisted";
		return days > 0 ? `${base} · ${plural(days, "day", "days")} strong` : base;
	},
	rowAmount: (value: number, target: number, unit: string | null) =>
		`${value} of ${target}${unit ? ` ${unit}` : ""}`,
	rowPerWeek: (times: number, done: number) =>
		`${times}× per week · ${done} done`,
	rowAtRisk: (weekday: string, freezesLeft: number) =>
		freezesLeft > 0
			? `Missed ${weekday} · ${plural(freezesLeft, "freeze", "freezes")} left`
			: `Missed ${weekday} · no freezes left`,
	rowFrozen: (weekdayShort: string, streak: number) =>
		`${weekdayShort} frozen · streak kept at ${streak}`,
	countButton: (value: number, target: number) => `${value}/${target}`,
	progressLabel: (done: number, total: number) => `${done} of ${total} done`,
	progressLabelOnDay: (done: number, total: number, day: string) =>
		`${done} of ${total} done on ${day}`,
	groupCount: (done: number, total: number) => `${done} of ${total}`,
	foldSummary: (count: number, names: string) =>
		`${count} not due today · ${names}`,
	foldSummaryOnDay: (count: number, names: string) =>
		`${count} not due · ${names}`,
	foldShow: "Show",
	foldHide: "Hide",
	notDueHeader: "Not due today",
	notDueHeaderOnDay: "Not due",
	bonusLogs: "Bonus logs",
	pickAnother: "Log a different habit",
	bonusSchedule: (schedule: string) => `${schedule} · tap to log a bonus`,
	bonusLogged: "Bonus · streak unchanged",
	backNextWeek: (done: number, times: number) =>
		`${done} of ${times} this week · back Monday`,
	restDayTitle: "Rest day",
	restDayBody:
		"Nothing is due today, so every streak is safe. Anything you log counts as a bonus.",
	restDayBodyOnDay:
		"Nothing was due on this day. Anything you log counts as a bonus.",
	emptyTitle: "Nothing to track yet",
	emptyBody: "Add a habit and it shows up here on every day it\u2019s due.",
	emptyAdd: "Add habit",
	emptySuggestions: "Browse suggestions",
	allDoneTitle: "All done for today",
	allDoneTitleOnDay: (day: string) => `All done on ${day}`,
	allDoneBody: (total: number, bestStreakName?: string, days?: number) =>
		bestStreakName && days
			? `${total} of ${total} · ${bestStreakName} is on a ${days}-day streak`
			: `${total} of ${total}`,
	pastDayBar: (day: string) => `Logging for ${day}`,
	showToday: "Show today",
	weekStripLabel: (range: string) => `Week of ${range}`,
	cantLogAhead: "Can\u2019t log ahead \u2014 pick today or an earlier day",
	/** VoiceOver (08.3). */
	openDetails: "Opens details.",
	openStreakOptions: "Opens the streak options.",
	openQuantity: "Opens the quantity sheet.",
	logOneMore: "Double-tap to log one more",
	markDone: "Double-tap to mark done",
	markNotDone: "Double-tap to mark not done",
	markResisted: "Double-tap to mark resisted",
	markNotResisted: "Double-tap to mark not resisted",
	logBonus: "Double-tap to log a bonus",
	circleNotDone: (name: string) => `${name}, not done`,
	circleDone: (name: string) => `${name}, done`,
	circleNotResisted: (name: string) => `${name}, resisted today?`,
	circleResisted: (name: string) => `${name}, resisted`,
	circleBonus: (name: string) => `${name}, not due, bonus`,
	circleAddOne: (name: string, value: number, target: number) =>
		`Add one, ${name}, ${value} of ${target}`,
	circleSetAmount: (name: string, value: number, target: number) =>
		`Set amount, ${name}, ${value} of ${target}`,
	countAmount: (value: number, target: number) =>
		`Amount, ${value} of ${target}`,
} as const;

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
		tone: spec.tone,
		...(undo ? { actionLabel: "Undo", onAction: undo } : {}),
	});
}
