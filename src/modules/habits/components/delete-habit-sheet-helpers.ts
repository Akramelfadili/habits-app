/** Delete confirmation copy (HAB-13) — docs/mockups/delete-confirm.png. */

export function deleteHeadline(name: string): string {
	return `Delete “${name}”?`;
}

/** "This removes the habit and all 218 logged days permanently. It cannot be undone." */
export function deleteConsequence(loggedDays: number): string {
	const what =
		loggedDays === 0
			? "the habit"
			: loggedDays === 1
				? "the habit and its 1 logged day"
				: `the habit and all ${loggedDays} logged days`;
	return `This removes ${what} permanently. It cannot be undone.`;
}

/** "Hides it from Today, keeps every log and the 24-day streak. Reversible any time." */
export function archiveInsteadBody(currentStreak: number): string {
	const kept =
		currentStreak > 0
			? `every log and the ${currentStreak}-day streak`
			: "every log";
	return `Hides it from Today, keeps ${kept}. Reversible any time.`;
}
