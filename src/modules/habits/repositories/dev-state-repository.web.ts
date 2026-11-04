import type * as NativeDevStateRepository from "./dev-state-repository";

/** Web has no database to fill: its repositories build each state from `?fixtures=` themselves. */
export async function replaceAllData(): Promise<void> {}

export async function storedHabitIds(): Promise<number[]> {
	return [];
}

// Compile-time guard: same exports as the native repository.
const _sameShape: Pick<
	typeof NativeDevStateRepository,
	"replaceAllData" | "storedHabitIds"
> = { replaceAllData, storedHabitIds };
void _sameShape;
