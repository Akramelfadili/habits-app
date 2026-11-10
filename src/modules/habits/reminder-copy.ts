import { REMINDER_CAP } from "./constants";

export const notificationCopy = {
	build: "Time for this one — check it off on Today.",
	break: "A nudge to keep resisting today.",
	genericTitle: "Habit reminder",
	eveningTitle: "Evening review",
	eveningBody: "Anything left to log today? Take a minute to catch up.",
} as const;

export const reminderCapMessage = `${REMINDER_CAP} of ${REMINDER_CAP} — remove one to add another. Four times a day is the cap per habit.`;
