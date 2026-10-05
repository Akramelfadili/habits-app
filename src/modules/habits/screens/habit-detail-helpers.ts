import { addDays, format, isSameDay, parseISO, subDays } from "date-fns";
import { WEEKDAYS } from "../constants";
import type { CompletionRate, LongestStreak } from "../services/habit-history";
import type { Entry, Frequency, Habit, IsoWeekday } from "../types";

const SHORT_DAY: Record<IsoWeekday, string> = {
	1: "Mon",
	2: "Tue",
	3: "Wed",
	4: "Thu",
	5: "Fri",
	6: "Sat",
	7: "Sun",
};

/** Archive or delete failed — shown while the confirmation stays open, so retrying is one tap. */
export const ARCHIVE_FAILED_MESSAGE = "Couldn't archive. Try again.";
export const DELETE_FAILED_MESSAGE = "Couldn't delete. Try again.";

/** "daily", "Mon–Fri", "Mon, Wed, Fri", "3× a week" — the cadence in Habit Detail's subtitle. */
export function frequencyLabel(frequency: Frequency): string {
	switch (frequency.type) {
		case "per-week":
			return `${frequency.timesPerWeek}× a week`;
		case "weekdays": {
			const days = [...frequency.days].sort((a, b) => a - b);
			if (days.length === WEEKDAYS.length) return "daily";
			const isRun =
				days.length >= 3 &&
				days.every((day, index) => index === 0 || day === days[index - 1] + 1);
			if (isRun) return `${SHORT_DAY[days[0]]}–${SHORT_DAY[days.at(-1) ?? 1]}`;
			return days.map((day) => SHORT_DAY[day]).join(", ");
		}
		default:
			return "daily";
	}
}

/** "Morning · 8 glasses · daily" / "Evening · Mon–Fri · added today" / "Morning · daily · archived". */
export function habitSubtitle(habit: Habit, today: Date): string {
	const parts = [habit.category.name];
	if (habit.targetType === "quantity" && habit.targetAmount) {
		parts.push(`${habit.targetAmount} ${habit.targetUnit ?? ""}`.trim());
	}
	parts.push(frequencyLabel(habit.frequency));
	if (isSameDay(habit.createdAt, today)) parts.push("added today");
	if (habit.archivedAt) parts.push("archived");
	return parts.join(" · ");
}

/** "days, in June" — or "no streak yet" before the first one. */
export function longestStreakCaption(longest: LongestStreak): string {
	if (longest.days === 0 || !longest.endedOn) return "no streak yet";
	const unit = longest.days === 1 ? "day" : "days";
	// Short month: "days, in September" overflows the third-width stat tile.
	return `${unit}, in ${format(longest.endedOn, "MMM")}`;
}

/** "87%" / "—" for the 90-day tile's numeral. */
export function completionRateValue(rate: CompletionRate): string {
	return rate.fraction === null ? "—" : `${Math.round(rate.fraction * 100)}%`;
}

/**
 * "78 of 90 days" — the 90-day rate's scheduled days, done/resisted of them.
 * Not "due" (audit #9 retired it), and not "scheduled" or "resisted" either:
 * the caption is one line in a third-width tile, which fits about 13
 * characters, and "days" reads right for Build and Break habits alike.
 */
export function completionRateCaption(rate: CompletionRate): string {
	if (rate.scheduled === 0) return "nothing yet";
	// Restored (E1): the tile says what it left out; the third-width tile
	// truncates it to "paused days…" and the accessibility label reads it whole.
	if (rate.skippedPaused) return "paused days skipped";
	return `${rate.completed} of ${rate.scheduled} days`;
}

/** "Today", "Yesterday", else "Mon 21 Sep". */
export function entryDateLabel(date: string, today: Date): string {
	const day = parseISO(date);
	if (isSameDay(day, today)) return "Today";
	if (isSameDay(day, subDays(today, 1))) return "Yesterday";
	return format(day, "EEE d MMM");
}

/** "6 / 8" for a quantity habit; "Done" / "Resisted" for a simple check. */
export function entryValueLabel(habit: Habit, entry: Entry): string {
	if (habit.targetType === "quantity") {
		return `${entry.value ?? 0} / ${habit.targetAmount ?? 0}`;
	}
	return habit.direction === "break" ? "Resisted" : "Done";
}

/** A noted day with nothing logged (HAB-10) — "Not resisted" keeps a Break habit's framing. */
export function notLoggedLabel(habit: Habit): string {
	return habit.direction === "break" ? "Not resisted" : "Not logged";
}

/** "Jul — Sep" across the heatmap's span, or a single month when it fits in one. */
export function heatmapRangeLabel(firstDay: Date, today: Date): string {
	const start = format(firstDay, "MMM");
	const end = format(today, "MMM");
	return start === end ? end : `${start} — ${end}`;
}

/** "Archived on 2 September". */
export function archivedBannerTitle(archivedAt: Date): string {
	return `Archived on ${format(archivedAt, "d MMMM")}`;
}

/** "Hidden from Today. All 41 logs kept." */
export function archivedBannerDetail(loggedDays: number): string {
	if (loggedDays === 0) return "Hidden from Today. No logs yet.";
	const logs = loggedDays === 1 ? "1 log" : `${loggedDays} logs`;
	return `Hidden from Today. All ${logs} kept.`;
}

/** The toast after an instant Restore (HAB-20 / E1). */
export function restoredToastMessage(habitName: string): string {
	return `${habitName} is back on Today`;
}

/** The Current tile while archived (D5): no number — the streak is paused, not zero. */
export function currentStreakTile(
	habit: Habit,
	currentStreak: number,
	/** Anything logged on or after the latest restore day — after that, a 0 is an ordinary miss. */
	loggedSinceRestore = false,
): { value: string; caption: string; muted: boolean } {
	if (habit.archivedAt) return { value: "—", caption: "paused", muted: true };
	if (currentStreak === 0 && habit.pauses.length > 0 && !loggedSinceRestore) {
		// Restored (E1): it starts fresh from the next completed log.
		return { value: "0", caption: "next log starts a streak", muted: true };
	}
	return {
		value: String(currentStreak),
		caption: "day streak",
		muted: currentStreak === 0,
	};
}

/** The 90-day tile's eyebrow — "Before archive" once archived, since the window ends at the archive day. */
export function completionRateLabel(habit: Habit): string {
	return habit.archivedAt ? "Before archive" : "90 days";
}

/** "2 – 15 Sep" / "28 Aug – 3 Sep" — the span between the archive day and the restore day. */
function daySpanLabel(from: Date, to: Date): string {
	return format(from, "MMM") === format(to, "MMM")
		? `${format(from, "d")} – ${format(to, "d MMM")}`
		: `${format(from, "d MMM")} – ${format(to, "d MMM")}`;
}

/**
 * The Detail heatmap's range line (HAB-20): the plain "Jul — Sep", then
 * "· ended 2 Sep" while archived (D5), or "· paused 2 – 15 Sep" for the most
 * recent past archive period that overlaps the grid (E1).
 */
export function heatmapRangeLabelFor(
	habit: Habit,
	firstDay: Date,
	today: Date,
): string {
	const base = heatmapRangeLabel(firstDay, today);
	if (habit.archivedAt)
		return `${base} · ended ${format(habit.archivedAt, "d MMM")}`;
	const recent = [...habit.pauses]
		.reverse()
		.find((pause) => parseISO(pause.to) >= firstDay);
	if (!recent) return base;
	const from = parseISO(recent.from);
	const restoredOn = addDays(parseISO(recent.to), 1);
	return `${base} · paused ${daySpanLabel(from, restoredOn)}`;
}

/**
 * The legend's frozen swatch: the live pool ("2 freezes left") on an active
 * habit; undefined while archived (VAR-09 "Archived — no count"), where the
 * shared pool says nothing about this habit, so the plain "Frozen" key stays.
 */
export function legendFrozenLabel(
	habit: Habit,
	freezesLeft: number,
): string | undefined {
	if (habit.archivedAt) return undefined;
	return `${freezesLeft} ${freezesLeft === 1 ? "freeze" : "freezes"} left`;
}

/** D6's passive line — shown only in the month a streak reset with the pool empty. */
export function streakResetNote(poolRefillsOn: Date): string {
	return `Streak reset — no freezes left this month. Pool refills on ${format(poolRefillsOn, "d MMMM")}.`;
}
