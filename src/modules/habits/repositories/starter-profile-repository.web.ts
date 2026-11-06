import type * as NativeStarterProfileRepository from "./starter-profile-repository";

/** Web has no database and no starter profile: its repositories build their own fixtures. */
export async function replaceHabitsWithStarterProfile(): Promise<
	NativeStarterProfileRepository.AppliedStarterHabit[]
> {
	return [];
}

// Compile-time guard: same exports as the native repository.
const _sameShape: Pick<
	typeof NativeStarterProfileRepository,
	"replaceHabitsWithStarterProfile"
> = { replaceHabitsWithStarterProfile };
void _sameShape;
