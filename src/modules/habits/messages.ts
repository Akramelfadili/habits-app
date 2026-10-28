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
	ranges: { week: "Week", month: "Month", year: "Year" },
	positionOf: (index: number, count: number) =>
		`Insight ${index + 1} of ${count}`,
	/** The eyebrow over the title; the date is already formatted. */
	eyebrow: {
		week: (start: string) => `Week of ${start}`,
	},
	backToYear: "Year",
	backToYearLabel: "Back to Year",
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
