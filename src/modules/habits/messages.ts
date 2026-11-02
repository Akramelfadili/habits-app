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
import type { DatabaseCopy } from "@/lib/db/database-copy";
import { showToast, type ToastTone } from "@/store/toast-store";
import { motion } from "@/theme/theme";
import { notificationCopy, reminderCapMessage } from "./reminder-copy";

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
	/** H5, D5: Restore is instant, so the toast carries the Undo. */
	habitRestored: {
		tone: "success",
		text: (habit: string) => `${habit} is back on Today`,
	},
	/** DC5: after Archive habit, Detail pops and the toast offers Undo. */
	habitArchived: {
		tone: "success",
		text: (habit: string) => `${habit} archived`,
	},
	/** DC3: permanent, so no Undo. */
	habitDeleted: {
		tone: "success",
		text: (habit: string) => `${habit} deleted`,
	},
	/** EX2: the sheet was closed while the file was writing. */
	exportReady: {
		tone: "success",
		text: (name: string) => `Export ready · ${name}`,
	},
	/** EX4: the sheet was closed and the export then failed; it stays until dismissed. */
	exportFailedWhileClosed: {
		tone: "error",
		text: "Export failed. Open Export data to retry — nothing was changed.",
	},
	/** S6: confirmed by a toast, no Undo — nothing changed. */
	diagnosticsCopied: { tone: "info", text: "Diagnostics copied" },
	diagnosticsShared: { tone: "info", text: "Diagnostics ready to share" },
	diagnosticsFailed: {
		tone: "error",
		text: "Couldn’t copy diagnostics. Try again.",
	},
	/** R3: removal is instant, so the toast carries the Undo (5 s). */
	reminderRemoved: {
		tone: "success",
		text: (time: string) => `Reminder at ${time} removed`,
	},
	/** FR3: Allow reminders on First Run's pre-prompt (4 s). */
	reminderSaved: {
		tone: "success",
		text: (time: string) => `Reminder saved \u00b7 ${time}`,
	},
	/** FR3 / R2: the reminder is stored, but iOS notifications are off (6 s). */
	reminderSavedOff: {
		tone: "warning",
		text: "Reminder saved, but notifications are off",
	},
	/** DC6: a category nobody used is gone at once; Undo puts it back (5 s). */
	categoryDeleted: {
		tone: "success",
		text: (name: string) => `${name} deleted`,
	},
	/** C5: a category in use is gone; its habits moved to Other and keep their history. */
	categoryDeletedMoved: {
		tone: "success",
		text: (name: string, count: number) =>
			`${name} deleted · ${count} ${count === 1 ? "habit" : "habits"} moved to Other`,
	},
	/** F7: the habit saved, but a reminder queued on the form did not. */
	habitSavedReminderFailed: {
		tone: "warning",
		text: "Saved, but a reminder couldn’t be set. Add it from the habit’s Reminders.",
	},
	/** P3: Export tapped while there is nothing to export — says why, in a toast. */
	exportNothing: {
		tone: "info",
		text: "Nothing to export yet. Log a habit on Today first, then come back.",
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
	/** SY1: what a screen reader says for the skeleton while Today loads. */
	loading: "Loading your habits",
	/** SY5: the app stayed open across midnight; Today has moved to the new day. */
	rollover: {
		title: (weekday: string) => `It\u2019s ${weekday} now`,
		body: (weekday: string, completed: number, total: number) =>
			total === 0
				? `${weekday} closed at midnight with nothing due. You can still log ${weekday} from the week strip.`
				: `${weekday} closed at midnight with ${completed} of ${total} done. You can still log ${weekday} from the week strip.`,
		dismiss: "Dismiss",
	},
	/** SY2: Today could not read its habits; the header and tab bar stay. */
	loadError: {
		title: "Couldn\u2019t load your habits",
		body: "Your data is safe. Trying again usually fixes this.",
		retry: "Try again",
		copyDiagnostics: "Copy diagnostics",
	},
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
	/** Distinct from the day sheet's "Done" underneath it: two sheets can be stacked (Edit this day → amount). */
	quantityDoneLabel: "Done with amount",
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
	rowResistTonight: (days: number) =>
		days > 0 ? `Resist tonight · ${days}-day streak` : "Resist tonight",
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
	circleNotResisted: (name: string, isToday = true) =>
		`${name}, resisted${isToday ? " today" : ""}?`,
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
 * Progress copy (HAB-35–38, V3-3b): the three ranges' titles, stats, insights,
 * legends and VoiceOver wording. Whole-number percentages everywhere; Break
 * habits say resisted and slipped, never failed (D8).
 */
export const progressCopy = {
	screenTitle: "Progress",
	export: "Export",
	exportLabel: "Export data",
	rangeLabel: "Range",
	rangeHint: "Opens the list of ranges",
	daily: "Daily",
	ranges: { week: "Week", month: "Month", year: "Year" },
	positionOf: (index: number, count: number) =>
		`Insight ${index + 1} of ${count}`,
	/** The eyebrow over the title; the date is already formatted. */
	eyebrow: {
		week: (start: string) => `Week of ${start}`,
	},
	/** A month opened from Year is a pushed screen: Back names the screen it returns to. */
	backToYear: "Year",
	legend: {
		less: "Less",
		more: "More",
		frozen: "Frozen",
		done: "Done",
		partial: "Partial",
		missed: "Missed",
		offSchedule: "Off-schedule",
		notLogged: "Not logged yet",
		future: "Future",
		freezesLeft: (count: number) =>
			`${count} ${count === 1 ? "freeze" : "freezes"} left`,
	},
	/** Words a cell is read as: "Wed, done". */
	cell: {
		done: "done",
		resisted: "resisted",
		partial: (percent: number) => `partial ${percent} percent`,
		missed: "missed",
		slipped: "slipped",
		frozen: "frozen",
		bonus: "bonus, not counted",
		notDue: "not due",
		beforeStart: "before you started",
		notLogged: "nothing logged yet",
		open: "not logged yet",
		upcoming: "upcoming",
		percent: (percent: number) => `${percent} percent`,
		inProgress: "in progress",
	},
	week: {
		cardTitle: "This week",
		summaryTitle: "Week summary",
		summaryMeta: "Due habits done per day",
		perfectDays: "Perfect days",
		freezesUsed: "Freezes used",
		bonusLogs: "Bonus logs",
		outlinedNote: "Outlined = nothing logged yet (not missed)",
		startedNote: (started: string, before: string) =>
			`Started ${started} · ${before} before start`,
		onlyHabit: (schedule: string) => `${schedule} · your only habit`,
		editDayLabel: (day: string) => `${day}. Edit this day`,
		editDayHint: "Edit this day",
		rowTotal: (done: number, target: number) => `${done} of ${target}`,
		barSummary: (best: string | null) =>
			best
				? `Due habits done per day, best ${best}`
				: "Due habits done per day, nothing done yet",
	},
	month: {
		cardMeta: "Daily completion",
		perHabitTitle: "Per habit",
		perHabitMeta: (period: string) => period,
		breakTag: "Break",
		slipping: "slipping",
		bonus: (count: number) => `${count} bonus, not counted`,
		frozen: (count: number) => `${count} frozen`,
		resisted: (done: number, due: number) => `Resisted ${done} of ${due}`,
		doneOf: (done: number, due: number) => `${done} of ${due}`,
		frozenNote: (days: string) => `${days} frozen`,
		aheadNote: (range: string) => `${range} still ahead`,
		startedNote: (started: string) =>
			`Started ${started} · earlier days dashed`,
		noRate: "—",
		habitRowLabel: (
			name: string,
			rate: string,
			schedule: string,
			counted: string,
		) => `${name}, ${rate}, ${schedule}, ${counted}`,
	},
	year: {
		allHabits: "All habits",
		cardTitle: (scope: string, year: number) => `${scope} · ${year}`,
		since: (date: string) => `Since ${date}`,
		rowsNote: "Rows Mon → Sun · tap a month to open it",
		monthLabel: (month: string) => `${month} ›`,
		monthOpens: (month: string, percent: string) =>
			`${month}, ${percent}. Opens Month.`,
		noData: "No data",
		monthsListTitle: (year: number) => `${year} by month`,
		chipLabel: (scope: string) => `Show habit: ${scope}`,
		pickerTitle: "Show habit",
		pickerClose: "Close",
		pickerActive: (count: number) => `${count} active`,
		pickerArchived: (count: number) => `Archived · ${count}`,
		pickerArchivedOn: (category: string, date: string) =>
			`${category} · archived ${date}`,
		pickerBreak: (category: string) => `${category} · Break`,
		archivedNote: "Archived habits keep their history.",
	},
	stats: {
		completion: "Completion",
		bestStreak: "Best streak",
		bestDay: "Best day",
		perfectDays: "Perfect days",
		bestMonth: "Best month",
		streak: "Streak",
		longest: "Longest",
		freezes: "Freezes",
		freezesUsed: "Freezes used",
		noValue: "—",
		ofDue: (done: number, due: number, soFar: boolean) =>
			`${done} of ${due}${soFar ? " so far" : ""}`,
		ofDueFrozen: (done: number, due: number, frozen: string) =>
			`${done} of ${due} due · ${frozen} frozen`,
		ofDueFrozenCount: (done: number, due: number, frozen: number) =>
			frozen > 0 ? `${done} of ${due} · ${frozen} frozen` : `${done} of ${due}`,
		streakDays: (habit: string | null) => (habit ? `${habit} · days` : "days"),
		noStreak: "No streak yet",
		bestDayDone: (done: number, due: number) => `${done} of ${due} done`,
		nothingDone: "Nothing done yet",
		delta: (points: number, versus: string) =>
			`${points > 0 ? "+" : points < 0 ? "−" : "±"}${Math.abs(points)} pts vs ${versus}`,
		perfectOf: (counted: number, soFar: boolean) =>
			`of ${counted}${soFar ? " so far" : ""}`,
		since: (date: string) => `since ${date}`,
		daysIn: (habit: string | null) => (habit ? `days · ${habit}` : "days"),
		days: "days",
		thisYear: "this year",
		thisMonth: "this month",
		freezesLeft: (count: number) =>
			`${count} ${count === 1 ? "freeze" : "freezes"} left`,
		bestMonthPercent: (percent: number) => `${percent}%`,
		tile: (label: string, value: string, caption: string) =>
			`${label}, ${value}, ${caption}`,
	},
	insight: {
		slippingTitle: (habit: string) => `${habit} is slipping`,
		slippingBody: (
			done: number,
			due: number,
			previousDone: number,
			previousDue: number,
			now: string,
			before: string,
		) =>
			`${done} of ${due} ${now}, ${previousDone} of ${previousDue} ${before}.`,
		upDays: (habit: string, days: number) =>
			`${habit} is up ${days} ${days === 1 ? "day" : "days"}`,
		upPoints: (habit: string, points: number) =>
			`${habit} is up ${points} points`,
		bestMonthTitle: (month: string) => `${month} was your best month`,
		bestMonthPerfect: "Every scheduled habit, every day.",
		bestMonthRate: (percent: number) =>
			`${percent} % of the days you scheduled were done.`,
		bestMonthNow: (month: string, percent: number) =>
			`${month} is at ${percent} % so far.`,
		nothingTitle: "Nothing to fix",
		perfectBody: "Every habit was done on every day it was due.",
		steadyBody: "Nothing is slipping. Every habit is holding steady.",
		steadyOne: (habit: string) => `${habit} is holding steady.`,
		changeFrequency: "Change frequency ›",
		thisWeek: "so far this week",
		lastWeek: "last week",
		thisMonth: "this month",
		inMonth: (month: string) => `in ${month}`,
		thisYear: "this year",
		lastYear: "last year",
	},
	unlock: {
		weekTitle: (days: number) =>
			`Insights unlock in ${days} ${days === 1 ? "day" : "days"}`,
		monthTitle: (days: number) =>
			`Month summary unlocks in ${days} ${days === 1 ? "day" : "days"}`,
		yearTitle: (days: number) =>
			`Year view unlocks in ${days} ${days === 1 ? "day" : "days"}`,
		weekBody: (logged: number) =>
			`They need 7 days of logs. ${logged === 1 ? "Your first day is" : `Your first ${logged} days are`} below.`,
		monthBody:
			"Rates and insights need 7 days of logs. Days so far are on the calendar.",
		yearBody: "It needs 7 days of logs. The current months are shown below.",
		progress: (logged: number, needed: number) => `${logged} of ${needed} days`,
	},
	empty: {
		noHabitsTitle: "No habits yet",
		noHabitsBody:
			"Progress fills in once you add a habit and tick it on Today.",
		addHabit: "Add habit",
		nothingLoggedTitle: "Nothing logged yet",
		nothingLoggedBody: (range: string) =>
			`Tick a habit on Today and this ${range} starts filling in.`,
		goToToday: "Go to Today",
	},
	day: {
		title: (date: string) => date,
		summary: (done: number, due: number, percent: number) =>
			`${done} of ${due} done · ${percent}%`,
		nothingDue: "Nothing was due",
		close: "Close",
		editThisDay: "Edit this day ›",
		editThisDayLabel: "Edit this day",
		state: {
			done: "Done",
			resisted: "Resisted",
			missed: "Missed",
			slipped: "Slipped",
			frozen: "Frozen",
			bonus: "Bonus, not counted",
			partial: (value: number, target: number) => `${value} of ${target}`,
			open: "Not logged yet",
			notLogged: "Nothing logged",
		},
		label: (date: string, done: number, due: number) =>
			`${date}, ${done} of ${due} done`,
	},
	monthNotes: {
		before: (date: string) => date,
	},
} as const;

/**
 * The Habits tab (HAB-39, V3-4a): its header, search, library, archived section
 * and empty states, with the VoiceOver wording of 08.3. "Weeks start Monday"
 * and every date style follow the rest of the app; nothing here says "failed".
 */
export const habitsCopy = {
	screenTitle: "Habits",
	settings: "Settings",
	addHabit: "Add habit",
	/** The eyebrow over the title: "7 active · 2 archived", "No habits", or the reorder line. */
	eyebrow: {
		counts: (active: number, archived: number) =>
			archived > 0
				? `${active} active · ${archived} archived`
				: `${active} active`,
		none: "No habits",
		reorder: "Reorder · drag within a category",
	},
	/** 08.3: "Habits, heading. 7 active, 1 archived." — VoiceOver adds "heading" from the role. */
	headerLabel: (counts: string) => `Habits, ${counts}`,
	counts: (active: number, archived: number) =>
		archived > 0
			? `${active} active, ${archived} archived`
			: `${active} active`,
	streakDays: (days: number) => `${days}-day streak`,
	resultArchived: (category: string, date: string) =>
		`${category} · archived ${date}`,
	daily: "Daily",
	breakWord: "Break",
	breakLower: "break",
	search: {
		label: "Search habits",
		cancel: "Cancel",
		clear: "Clear text",
	},
	activeHeader: (count: number) => `Active · ${count}`,
	reorder: "Reorder",
	reorderLabel: "Reorder habits",
	reorderDone: "Done",
	reorderHint:
		"Habits move within their category. To change a category, use Edit.",
	reorderHandle: (habit: string) => `Reorder ${habit}`,
	moveUp: "Move up",
	moveDown: "Move down",
	archiveAction: "Archive",
	/** What a library row's tap does, for VoiceOver (08.3). */
	rowHint: "Opens details.",
	archived: {
		header: (count: number) => `Archived · ${count}`,
		show: "Show",
		hide: "Hide",
		/** 08.3: "Archived, 2, collapsed. Button." */
		toggleLabel: (count: number, expanded: boolean) =>
			`Archived, ${count}, ${expanded ? "expanded" : "collapsed"}`,
		restore: "Restore",
		restoreLabel: (habit: string) => `Restore ${habit}`,
		since: (date: string) => `Archived ${date}`,
		bestStreak: (days: number) => `best streak ${days}`,
		/** 08.3: "Morning run, archived 12 October. Restore, button." */
		rowLabel: (habit: string, date: string) => `${habit}, archived ${date}`,
		note: "A restored habit starts a fresh streak. Paused days stay paused.",
	},
	categories: "Categories",
	categoriesLabel: (count: number) => `Categories, ${count}`,
	noResults: {
		title: (query: string) => `No habits match “${query}”`,
		body: "Search looks through active and archived habits.",
		add: (name: string) => `Add “${name}” as a habit`,
	},
	/** H6: no habits at all. The suggestions link joins it with HAB-46. */
	empty: {
		title: "No habits yet",
		body: "Add your first habit, or start from a suggestion.",
		add: "Add habit",
	},
	/** Every habit is archived: Today is empty, Restore is below. */
	allArchived: {
		title: "No active habits",
		body: "Everything is archived, so Today is empty. Restore one below or add a new habit.",
	},
} as const;

/**
 * Habit Detail (HAB-40, V3-4a) and its two confirm sheets (HAB-45): the tiles,
 * the five-week grid, the history rows, the archived and restored banners and
 * the delete and archive sheets, with the VoiceOver wording of 08.3. A Break
 * habit says resisting, resisted and slipped — never failed (D8, D7). No time
 * ever appears in the history (per-entry timestamps may not exist).
 */
export const detailCopy = {
	edit: "Edit",
	/** The eyebrow and VoiceOver's cadence (08.3). */
	words: {
		daily: "Daily",
		dailySpoken: "daily",
		break: "Break",
		breakSpoken: "break",
		archived: "Archived",
		archivedSpoken: "archived",
		perWeekSpoken: (times: number) => `${times} times per week`,
		and: " and ",
		weekdays: [
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday",
			"Sunday",
		],
	},
	/** The tiles. Build habits say streak; Break habits say resisting. */
	stats: {
		streak: "Streak",
		resisting: "Resisting",
		longest: "Longest",
		rate: "90-day rate",
		freezes: "Freezes",
		inARow: "in a row",
		nightsInARow: "nights in a row",
		days: "days",
		nights: "nights",
		/** D3: nothing has been logged yet. */
		startsWithFirstLog: "starts with your first log",
		noneYet: "none yet",
		afterSevenDays: "after 7 days",
		/** D4: archived — the streak is paused, not zero. */
		paused: "paused",
		untilArchive: (date: string) => `until ${date}`,
		/** D5: restored — a fresh start, and the rate leaves the paused days out. */
		freshStart: "fresh start",
		pausedDaysExcluded: "paused days excluded",
		resisted: "resisted",
		/** D6: the freezes tile. */
		freezesLeft: (count: number) =>
			`${count} ${count === 1 ? "freeze" : "freezes"} left`,
		delta: (points: number) =>
			points === 0
				? "no change"
				: `${points > 0 ? "+" : "−"}${Math.abs(points)} pts`,
		/** The rate's fallback line when there is nothing to compare it with. */
		ofDays: (done: number, due: number) =>
			`${done} of ${due} ${due === 1 ? "day" : "days"}`,
	},
	grid: {
		title: "Last 5 weeks",
		/** The right of the title: "Tue, Thu", "Daily", or "Created today". */
		createdToday: "Created today",
		daily: "Daily",
		legend: {
			done: "Done",
			resisted: "Resisted",
			missed: "Missed",
			slipped: "Slipped",
			frozen: "Frozen",
			bonus: "Bonus",
			notDue: "Not due",
			paused: "Paused",
			reset: "Reset",
			beforeStart: "Before start",
		},
		/** 08.3: "Week of 19 October: Monday bonus, Tuesday done, Thursday not logged yet. Button. Opens Edit this day." */
		weekLabel: (start: string, days: string) => `Week of ${start}: ${days}`,
		weekHint: "Opens Edit this day.",
		status: {
			done: "done",
			resisted: "resisted",
			partial: "partial",
			missed: "missed",
			slipped: "slipped",
			frozen: "frozen",
			bonus: "bonus",
			notDue: "not due",
			paused: "paused",
			reset: "missed, streak reset",
			beforeStart: "before start",
			notLoggedYet: "not logged yet",
			upcoming: "upcoming",
		},
		/** D6: shown only in the month the streak reset. */
		resetNotice: (date: string) =>
			`Streak reset on ${date} — no freezes were left.`,
	},
	reminders: {
		header: "Reminders",
		label: "Reminders",
		allOff: "All off",
		nOn: (count: number, times: string) => `${count} on · ${times}`,
		timeDays: (time: string, days: string) => `${time} · ${days}`,
		/** 08.3: "Reminders, 07:00, Tuesday and Thursday." */
		spoken: (time: string, days: string) => `Reminders, ${time}, ${days}`,
		none: "None",
		paused: "Paused",
	},
	history: {
		header: "History",
		empty: "No logs yet. Tick it on Today to start.",
		done: "Done",
		resisted: "Resisted",
		missed: "Missed",
		slipped: "Slipped · not logged",
		frozen: "Frozen · streak kept",
		bonus: "off-schedule, not counted",
		bonusTag: "Bonus",
		partial: (value: number, target: number, unit: string | null) =>
			`${value} of ${target}${unit ? ` ${unit}` : ""}`,
		notLogged: "Not logged",
		/** A day that only carries a note (never "Slipped": nothing was due or lost). */
		noted: "Note",
	},
	archive: {
		row: "Archive habit",
		rowBody: "Hide from Today, keep history",
	},
	delete: {
		row: "Delete habit",
	},
	banner: {
		archivedTitle: (date: string) => `Archived on ${date}`,
		archivedBody:
			"Hidden from Today. Paused days stay paused and never count as missed.",
		restore: "Restore",
		restoredTitle: "Restored today",
		restoredBody:
			"Your streak starts fresh with the next log. Paused days stay paused.",
	},
	/** DC1–DC5: the delete and archive confirms. */
	confirm: {
		cancel: "Cancel",
		deleteTitle: (habit: string) => `Delete ${habit}?`,
		deleteBody: (habit: string, logs: number, canArchive: boolean) => {
			const what =
				logs === 0
					? `Deletes ${habit}. It has no logs yet.`
					: `Deletes ${habit} and its ${logs} ${logs === 1 ? "log" : "logs"}.`;
			const keeps = logs > 1 ? "them" : "it";
			return canArchive
				? `${what} Archiving keeps ${keeps} and can be undone.`
				: `${what} This can’t be undone.`;
		},
		archiveInstead: "Archive instead",
		archiveInsteadBody: "Hide from Today, keep history",
		deletePermanently: "Delete permanently",
		deleteHint: "One tap deletes. This can’t be undone.",
		deleting: "Deleting…",
		deletingHint: "Keep the app open — this takes a moment.",
		deleteFailedTitle: "Couldn’t delete",
		deleteFailedBody: "Nothing was changed. Try again.",
		archiveTitle: (habit: string) => `Archive ${habit}?`,
		archiveBody:
			"It leaves Today and its reminders pause. History and streaks are kept — restore it any time from Habits › Archived.",
		archiveConfirm: "Archive habit",
	},
	notFound: {
		title: "Habit not found",
		body: "It may have been deleted.",
	},
} as const;

/**
 * The Add / Edit habit form (HAB-41, F1–F10, BS2): headers, field labels,
 * helpers, inline errors, the Save reason and the discard prompt. Errors sit
 * next to their fields, never in an alert (F8).
 */
export const formCopy = {
	newTitle: "New habit",
	editTitle: "Edit habit",
	close: "Close",
	loading: "Loading…",
	type: {
		label: "Type",
		build: "Build",
		break: "Break",
		/** F5: said once Break is picked. */
		breakNote:
			"A Break habit counts the days you resist. Tick the circle on each day you held off.",
		/** Edit: the direction is fixed at creation (HAB-01) — a streak means the opposite. */
		locked: "Build and Break can’t be switched after saving.",
	},
	name: {
		label: "Name",
		placeholder: "e.g. Drink water",
		limit: (limit: number) => `${limit} characters max`,
		duplicate: (name: string) =>
			`You already have a habit called ${name}. Choose another name.`,
		/** An edited V1 name still over the cap (HAB-22). */
		tooLong: (limit: number) => `Shorten the name to ${limit} characters.`,
	},
	category: {
		label: "Category",
		optional: "Optional — habits without one go to Other.",
		newCategory: "New category",
	},
	goal: {
		label: "Goal",
		check: "Check",
		quantity: "Quantity",
		/** F5: Quantity is off for a Break habit, with its reason. */
		breakReason: "Break habits are yes or no, so Quantity is off.",
		target: "Daily target",
		targetCaption: (unit: string) => `${unit || "units"} a day`,
		unit: "Unit",
		unitPlaceholder: "glasses",
		unitMissing: "Give this target a unit, e.g. “glasses”.",
		unitTooLong: (limit: number) => `Keep the unit under ${limit} characters.`,
		/** F3: the live example of how Today reads. */
		example: (target: number, unit: string) =>
			`Shown after the number: ${Math.max(1, Math.min(5, target - 1))} of ${target}${unit ? ` ${unit}` : ""}`,
	},
	frequency: {
		label: "Frequency",
		daily: "Daily",
		specificDays: "Specific days",
		perWeek: "× per week",
		noDays: "Pick at least one day",
		timesPerWeek: "Times per week",
		timesCaption: "times a week",
		/** F4: the Monday–Sunday rule (D9) and when it leaves Today. */
		perWeekRule: (times: number) =>
			`Weeks run Monday to Sunday. Once you reach ${times}, it leaves Today until the next week starts.`,
	},
	reminders: {
		label: "Reminders",
		add: "Add time",
		hint: "24-hour times. Each time can repeat on its own days.",
	},
	save: {
		new: "Save habit",
		edit: "Save changes",
		needsName: "Add a name to save",
		needsUnit: "Add a unit to save",
		issues: (count: number) =>
			`Fix ${count} ${count === 1 ? "issue" : "issues"} to save`,
	},
	archive: {
		title: "Archive habit",
		body: "Hides it from Today and keeps every logged day. Restore it any time.",
	},
	discard: {
		title: "Discard changes?",
		bodyEdit: (habit: string) => `Your edits to ${habit} won’t be saved.`,
		bodyNew: "Your new habit won’t be saved.",
		keep: "Keep editing",
		discard: "Discard",
	},
	/** BS2: where the filled-in fields came from. */
	prefill: {
		title: "From a suggestion",
		body: (name: string) =>
			`${name} is filled in. Change anything before saving.`,
	},
} as const;

/**
 * First run (HAB-46, FR1–FR4): the welcome, the slim first-habit form's extras
 * and our own notification pre-prompt. The Today empty state (FR4) is
 * `todayCopy`; the suggestions list is `suggestionsCopy`.
 */
export const firstRunCopy = {
	welcome: {
		/** Two balanced lines, as FR1 draws them; read as one sentence. */
		title: "Small habits,\nevery day",
		body: "Tick them off on Today, see your week in Progress, and keep streaks going on off days with freezes.",
		features: [
			{ key: "today", title: "Today", body: "Tick what\u2019s due" },
			{ key: "progress", title: "Progress", body: "Week, month and year" },
			{
				key: "freezes",
				title: "Freezes",
				body: "Keep a streak through a missed day",
			},
		],
		addFirst: "Add your first habit",
		browse: "Browse suggestions",
		/** Not drawn in FR1: every first-run screen has a way to an empty Today. */
		skip: "Skip for now",
	},
	/** The welcome could not write its flag: an inline banner, since no toast host exists before the tabs. */
	continueFailed: "Couldn\u2019t continue. Try again.",
	habit: {
		title: "Your first habit",
		pickLabel: "Or pick one",
		/** FR2's reassurance. The frame also says "icon": a habit's icon is its category's, so it is left out. */
		note: "Category and reminders can wait \u2014 change them any time.",
	},
	/** FR3: the pre-prompt shown before iOS asks for permission. */
	offer: {
		title: "Remind you each day?",
		body: (habit: string, time: string) =>
			`A nudge at ${time} to log ${habit}. Change the time or turn it off in Reminders.`,
		allow: "Allow reminders",
		notNow: "Not now",
		/** The default reminder could not be written; the habit is saved either way. */
		failed:
			"Couldn\u2019t set the reminder. Add it from the habit\u2019s Reminders.",
	},
} as const;

/**
 * Browse suggestions (HAB-46, BS1): the intro, the group headings, the
 * subtitle under each suggestion and the "Added" mark.
 */
export const suggestionsCopy = {
	title: "Suggestions",
	close: "Close",
	intro:
		"Tap one to open Add habit with it filled in. Change anything before saving.",
	/** The heading of the suggestions that are Break habits, whatever their category. */
	breakGroup: "Break a habit",
	added: "Added",
	/** One stop per suggestion (08.3 has no row for it; wording is ours, logged in the backlog). */
	rowLabel: (name: string, subtitle: string) => `${name}, ${subtitle}`,
	rowHint: "Opens Add habit with this filled in.",
	addedLabel: (name: string, subtitle: string) => `${name}, ${subtitle}. Added`,
	addedHint: "Already in your habits.",
	quantity: (amount: number, unit: string) =>
		`Quantity \u00b7 ${amount} ${unit} a day`,
	perWeek: (times: number) => `${times}\u00d7 per week`,
	daily: "Daily",
	breakWord: "Break",
	breakDaily: "Break \u00b7 daily",
	/** The link in the empty Today (T2, FR4) and the empty Habits tab (H6), and FR1's second action. */
	browse: "Browse suggestions",
} as const;

/**
 * The database gate (HAB-47, SY3 and SY4), handed to `DatabaseProvider` by the
 * root layout. Every claim is checked against the migrator: it runs all pending
 * migrations in one transaction, so a failed run is rolled back whole ("Nothing
 * was changed", "as they were") and a run never deletes a person's habits
 * ("Nothing is deleted"). There is no step or count to report, so neither
 * screen names one (the frames' "Step 2 of 3", "64%").
 */
export const migrationCopy = {
	updating: {
		title: "Updating your data",
		body: "This version stores habits in a new format. It usually takes under a minute.",
		progress: "Updating your habits",
		keepOpen: "Keep the app open. No habits or history are deleted.",
	},
	updateFailed: {
		title: "Update didn\u2019t finish",
		message: "Your habits are as they were before the update.",
		reason: {
			title: "The update stopped",
			message:
				"Nothing was changed. Try again, or copy diagnostics for support.",
		},
	},
	openFailed: {
		title: "Couldn\u2019t open your data",
		message:
			"The app couldn\u2019t prepare its database. Nothing was lost. Try again, and if it keeps happening, copy the diagnostics and send them over.",
	},
} satisfies DatabaseCopy;

/**
 * Categories (HAB-42, C1–C6, DC6): the screen's header and groups, the rows,
 * the inline rename, the add sheet and the two delete confirms. Counts always
 * include archived habits.
 */
export const categoriesCopy = {
	title: "Categories",
	/** The eyebrow: "10 built-in · 2 custom", or just the built-ins before any custom exists (C6). */
	eyebrow: (builtIn: number, custom: number) =>
		custom > 0
			? `${builtIn} built-in · ${custom} custom`
			: `${builtIn} built-in`,
	/** 08.3: "Categories, heading. 10 built-in, 2 custom." */
	headerLabel: (builtIn: number, custom: number) =>
		custom > 0
			? `Categories, ${builtIn} built-in, ${custom} custom`
			: `Categories, ${builtIn} built-in`,
	reorder: "Reorder",
	reorderHint: "Opens the list to drag categories into a new order.",
	done: "Done",
	add: "Add category",
	customHeader: (count: number) => `Custom · ${count}`,
	builtInHeader: (count: number) => `Built-in · ${count}`,
	builtInNote: "Built-ins can’t be renamed or deleted.",
	builtInTag: "Built-in",
	/** "2 habits", "2 habits · 1 archived", "1 archived", or "Not used" — archived habits are counted (C1). */
	count: (active: number, archived: number) => {
		if (active === 0 && archived === 0) return "Not used";
		const habits = `${active} ${active === 1 ? "habit" : "habits"}`;
		if (archived === 0) return habits;
		return active === 0
			? `${archived} archived`
			: `${habits} · ${archived} archived`;
	},
	rename: "Rename",
	renameLabel: (name: string) => `Rename ${name}`,
	deleteLabel: (name: string) => `Delete ${name}`,
	delete: "Delete",
	/** C6: the empty custom section teaches the feature. */
	empty: { title: "Add a category", body: "Group habits your own way" },
	reorderMode: {
		eyebrow: "Reorder · sets group order",
		note: "Groups on Today and Habits follow this order. Other stays last.",
		handle: (name: string) => `Reorder ${name}`,
		moveUp: "Move up",
		moveDown: "Move down",
		/** VoiceOver after a move: the new place. */
		moved: (name: string, place: number, total: number) =>
			`${name}, ${place} of ${total}`,
	},
	/** The inline rename (C3). */
	renameField: {
		label: (name: string) => `Rename ${name}`,
		save: "Done",
		saveLabel: (name: string) => `Save new name for ${name}`,
		failed: "Couldn’t rename this category. Try again.",
	},
	/** Rename and add share one rule: no two groups with the same name (C3). */
	duplicate: (name: string) => `${name} already exists. Choose another name.`,
	addSheet: {
		title: "New category",
		close: "Close",
		name: "Name",
		placeholder: "e.g. Journaling",
		preview: "Preview",
		previewPlaceholder: "Your category",
		note: "Icon and colour are picked for you from those not in use.",
		submit: "Add category",
		needsName: "Add a name to create this category",
		failed: "Couldn’t add this category. Try again.",
	},
	deleteSheet: {
		headline: (name: string) => `Delete ${name}?`,
		/** C5: names how many habits move, and that nothing about them is lost. */
		inUse: (count: number) =>
			count === 1
				? "1 habit uses it. It moves to Other — its history and streak are kept."
				: `${count} habits use it. They move to Other — their history and streaks are kept.`,
		/** DC6: nothing is lost, so one button. */
		unused: "No habit uses it, so nothing else changes.",
		move: (from: string, to: string) => `${from} → ${to}`,
		confirmUnused: "Delete category",
		confirmInUse: (count: number) =>
			`Delete and move ${count} ${count === 1 ? "habit" : "habits"}`,
		cancel: "Cancel",
	},
} as const;

/** Day-set names on a reminder row and the "not a scheduled day" warning. */
export const reminderDaysCopy = {
	none: "No days",
	everyDay: "Every day",
	weekdays: "Weekdays",
	unscheduled: (names: string, count: number) =>
		count === 1
			? `${names} is not a scheduled day for this habit — this reminder would fire for nothing.`
			: `${names} are not scheduled days for this habit — this reminder would fire for nothing.`,
} as const;

/**
 * The Reminders screen (HAB-43, R1–R3, R5): one habit's 24-hour times, each with
 * its own days. Removal is instant with an Undo toast; the notifications-off
 * banner explains why nothing arrives while the times stay editable.
 */
export const remindersCopy = {
	title: "Reminders",
	/** The eyebrow: the habit and how it repeats ("Upper body · Tue, Thu"). */
	eyebrow: (habit: string, schedule: string) => `${habit} · ${schedule}`,
	add: "Add time",
	cap: reminderCapMessage,
	/** R1: nothing yet — one clear action. */
	empty: {
		title: "No reminders yet",
		body: "Add a time and choose the days it repeats.",
	},
	hint: "24-hour times. Tap a time to change its days.",
	remove: (time: string) => `Remove reminder at ${time}`,
	/** What a row says it does, for VoiceOver (08.3). */
	rowHint: "Opens its time and days.",
	/** A reminder switched off before V3 (the toggle is gone): said on its row, turned on again by editing. */
	off: "Off",
	/** R5. */
	denied: {
		title: "Notifications are off",
		body: "Reminders won’t arrive until you allow them in iOS Settings.",
		action: "Open Settings",
	},
} as const;

/**
 * Settings (HAB-44, S1–S7, SY6): Appearance, Reminders (the evening review and
 * what notifications being off affects), Streaks (the freeze rule in plain
 * words), Data and About. Week start and text size are explained, not set.
 */
export const settingsCopy = {
	title: "Settings",
	appearance: {
		header: "Appearance",
		theme: { light: "Light", dark: "Dark", system: "System" },
		/** The System row says what it resolves to right now. */
		systemNow: (scheme: "light" | "dark") => `Follows iOS · now ${scheme}`,
		note: "Weeks start on Monday. Text size follows iOS Settings › Display & Text Size.",
	},
	reminders: {
		header: "Reminders",
		evening: "Evening review",
		eveningBody: "A nudge if anything is still open",
		time: "Time",
		eveningNote: "Sent only on days with open habits.",
		notifications: "Notifications",
		allowed: "Allowed",
		off: "Off",
		notAsked: "Not asked yet",
	},
	/** SY6: one banner for the whole impact, and what is affected. */
	denied: {
		title: "Notifications are off",
		body: "Reminders and the evening review won’t arrive until you allow them in iOS Settings.",
		action: "Open Settings",
		affected: "Affected",
		reminders: "Reminders",
		/** "4 times on 3 habits" — enabled times, and the habits they belong to. */
		remindersImpact: (times: number, habits: number) =>
			times === 0
				? "No reminders set"
				: `${times} ${times === 1 ? "time" : "times"} on ${habits} ${habits === 1 ? "habit" : "habits"}`,
		evening: "Evening review",
		eveningImpact: (on: boolean, time: string) => (on ? time : "Off"),
		note: "Times stay editable while notifications are off. Nothing is deleted.",
	},
	streaks: {
		header: "Streaks",
		left: "Left this month",
		used: "Used this month",
		/** "1 of 2" */
		leftValue: (left: number, size: number) => `${left} of ${size}`,
		rule: (size: number) =>
			`${size} freezes a month, shared by all habits. They don’t roll over.`,
		/** The Undo window is the toast's own (5 s), so the sentence cannot drift from it. */
		how: `A freeze keeps a streak when you miss a scheduled day. You use one from the streak-at-risk sheet; Undo works for ${motion.toast.hold.undo / 1000} s.`,
	},
	data: {
		header: "Data",
		export: "Export data",
		exportValue: "JSON, CSV",
	},
	about: {
		header: "About",
		version: "Version",
		copy: "Copy diagnostics",
		copyBody: "Version, device and recent errors",
		copyValue: "Copy",
	},
} as const;

/**
 * Export data (HAB-44, EX1–EX4): choose JSON or CSV, watch it write, then share
 * the file — or read why it failed. Closing the sheet keeps a running export
 * going; a toast says when it is ready.
 */
export const exportCopy = {
	title: "Export data",
	close: "Close",
	format: "Format",
	formatLabel: "File format",
	json: "JSON",
	csv: "CSV",
	explain:
		"JSON has everything, for backup or another app. CSV has one row per log, for spreadsheets.",
	button: (format: "JSON" | "CSV") => `Export ${format}`,
	exporting: "Exporting…",
	writing: (name: string) => `Writing ${name}`,
	progressNote:
		"Usually under a second. Closing the sheet keeps it going; a toast says when it’s ready.",
	/** "48 KB · 9 habits · 1,284 logs" */
	fileMeta: (size: string, habits: string, logs: string) =>
		`${size} · ${habits} · ${logs}`,
	share: "Share file",
	done: "Done",
	shareNote:
		"Share opens the iOS share sheet. The file is temporary — export again if it’s gone.",
	shareFailed: "Couldn’t share the file. Try again.",
	failed: {
		title: "Export failed",
		/** The reason first, then what did not happen. */
		storage:
			"Not enough storage on this iPhone. Nothing was changed — free up space, then retry.",
		unknown:
			"Something went wrong while writing the file. Nothing was changed — try again.",
		retry: "Retry",
		cancel: "Cancel",
	},
} as const;

/** The reminder sheet (F7, R3): the time wheel and the days a time repeats on. */
export const reminderSheetCopy = {
	add: "Add time",
	edit: "Reminder time",
	eveningTime: "Evening review time",
	cancel: "Cancel",
	save: "Save time",
	repeatOn: "Repeat on",
	noDays: "Pick at least one day",
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

export { notificationCopy };
