import { EVENING_REVIEW_TIME } from "../constants";

type Time = { hour: number; minute: number };

export function parseEveningReviewTime(
	stored: string | null | undefined,
): Time {
	const match = /^(\d{2}):(\d{2})$/.exec(stored ?? "");
	if (!match) return EVENING_REVIEW_TIME;
	const hour = Number(match[1]);
	const minute = Number(match[2]);
	return hour < 24 && minute < 60 ? { hour, minute } : EVENING_REVIEW_TIME;
}

export function formatEveningReviewTime({ hour, minute }: Time): string {
	return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
