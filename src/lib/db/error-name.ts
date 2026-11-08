/**
 * A loggable code for a failure: the error's name, lower-cased (`rangeerror`),
 * and nothing else. A database error's message can hold a path or a SQL
 * fragment, so the recovery logs carry the name only. Duck-typed because an
 * error from another JavaScript realm is not `instanceof Error`.
 */
export function errorNameOf(error: unknown): string {
	if (typeof error === "object" && error !== null) {
		const name = (error as { name?: unknown }).name;
		if (typeof name === "string" && /^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(name)) {
			return name.toLowerCase();
		}
	}
	return "nonerror";
}

/** The message of an error-like value, or "" — for matching, never for logging. */
export function errorMessageOf(error: unknown): string {
	if (typeof error === "object" && error !== null) {
		const message = (error as { message?: unknown }).message;
		if (typeof message === "string") return message;
	}
	return "";
}
