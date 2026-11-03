/**
 * Whether the app opens on First Run (HAB-46): only while the database has no
 * habits (archived ones count) AND nothing marks First Run as seen. Pure, so
 * the rule is tested without a database.
 *
 * - "loading": the flag or the habit list has not been read yet; nothing is
 *   decided, so nothing flashes.
 * - "first-run": no habits and never seen.
 * - "done": seen already, or habits exist (an installed app that predates the
 *   flag). `shouldMarkSeen` says whether the flag must be written now, so
 *   deleting every habit later can never bring First Run back.
 */
export type FirstRunGate = "loading" | "first-run" | "done";

type FirstRunState = {
	/** The stored flag: `undefined` while it is being read, `null` when never set. */
	seenFlag: string | null | undefined;
	/** The number of habits, archived included; `undefined` until the list has loaded. */
	habitCount: number | undefined;
};

export function firstRunGate({
	seenFlag,
	habitCount,
}: FirstRunState): FirstRunGate {
	if (seenFlag === undefined) return "loading";
	if (seenFlag !== null) return "done";
	if (habitCount === undefined) return "loading";
	return habitCount === 0 ? "first-run" : "done";
}

/** True when the gate is "done" only because habits exist and the flag was never written. */
export function shouldMarkSeen({
	seenFlag,
	habitCount,
}: FirstRunState): boolean {
	return seenFlag === null && habitCount !== undefined && habitCount > 0;
}
