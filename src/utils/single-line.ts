// A global replace: every line break becomes a space, not only the first.
export function singleLine(text: string): string {
	return text.replace(/\r?\n/g, " ");
}
