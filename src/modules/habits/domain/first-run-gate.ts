// "loading" decides nothing so nothing flashes. `shouldMarkSeen` writes the flag for installs
// that predate it, so deleting every habit later never brings First Run back.
export type FirstRunGate = "loading" | "first-run" | "done";

type FirstRunState = {
	seenFlag: string | null | undefined;
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

export function shouldMarkSeen({
	seenFlag,
	habitCount,
}: FirstRunState): boolean {
	return seenFlag === null && habitCount !== undefined && habitCount > 0;
}
