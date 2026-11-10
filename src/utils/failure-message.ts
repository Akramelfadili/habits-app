export const GENERIC_FAILURE_MESSAGE = "Something went wrong. Try again.";

// Never raw error text: that goes to the log.
export function failureMessage(verb: string, noun: string): string {
	return `Couldn't ${verb} ${noun}. Try again.`;
}

// An Undo's toast is already gone, so there is nothing to "try again" on.
export const UNDO_FAILED_MESSAGE = "Couldn't undo that.";
