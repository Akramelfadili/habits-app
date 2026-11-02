import { REMINDER_CAP } from "./constants";

/**
 * Reminder text with no UI behind it, so the services (which sit below the
 * components) can use it: what the OS shows in a notification, and the cap
 * message the service throws. `messages.ts` re-exports both for the screens.
 */
export const notificationCopy = {
	build: "Time for this one — check it off on Today.",
	break: "A nudge to keep resisting today.",
	eveningTitle: "Evening review",
	eveningBody: "Anything left to log today? Take a minute to catch up.",
} as const;

/** Under the disabled Add row, and the service's cap error. */
export const reminderCapMessage = `${REMINDER_CAP} of ${REMINDER_CAP} — remove one to add another. Four times a day is the cap per habit.`;
