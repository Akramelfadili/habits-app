import { type PropsWithChildren, useState } from "react";
import { DatabaseErrorScreen } from "./database-error-screen";

/**
 * Web-only stand-in for `database-provider.tsx`. Web has no SQLite (repositories
 * swap to in-memory fixtures via their own `.web.ts` files), so there's nothing
 * to migrate — and importing `./client` here would crash on expo-sqlite's
 * missing web binding.
 *
 * The one thing it keeps is the failure path, so the error screen can be
 * reached by the visual check and tests without a dev-only route in the app:
 * `?fixtures=migration-fails` fails every attempt, `?fixtures=migration-fails-once`
 * fails the first and lets Retry recover.
 */
function simulatedFailure(attempt: number): Error | null {
	const search = globalThis.location?.search ?? "";
	const scenario = new URLSearchParams(search).get("fixtures");
	if (scenario === "migration-fails") {
		return new Error("Simulated migration failure");
	}
	if (scenario === "migration-fails-once" && attempt === 0) {
		return new Error("Simulated migration failure");
	}
	return null;
}

export function DatabaseProvider({ children }: PropsWithChildren) {
	const [attempt, setAttempt] = useState(0);
	const failure = simulatedFailure(attempt);

	if (failure) {
		return (
			<DatabaseErrorScreen
				error={failure}
				onRetry={() => setAttempt((n) => n + 1)}
			/>
		);
	}
	return children;
}
