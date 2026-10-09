/** Shown when a failure has no more specific wording (an Undo, a stray rejection). */
export const GENERIC_FAILURE_MESSAGE = "Something went wrong. Try again.";

/**
 * The one wording for a failed write: `failureMessage("archive", "this habit")`
 * → "Couldn't archive this habit. Try again." Never raw error text — that goes
 * to the log.
 */
export function failureMessage(verb: string, noun: string): string {
	return `Couldn't ${verb} ${noun}. Try again.`;
}

/** A failed Undo: its toast is already gone, so there is nothing to "try again" on. */
export const UNDO_FAILED_MESSAGE = "Couldn't undo that.";
