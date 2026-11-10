import { type PropsWithChildren, useState } from "react";
import type { DatabaseCopy } from "./database-copy";
import { DatabaseErrorScreen } from "./database-error-screen";
import { MigrationScreen } from "./migration-screen";

/**
 * Web-only stand-in for `database-provider.tsx`. Web has no SQLite (repositories swap to
 * in-memory fixtures via their own `.web.ts` files), so there is nothing to migrate, and importing
 * `./client` here would crash on expo-sqlite's missing web binding.
 *
 * It keeps the migration screens so the visual check and tests can reach them without a dev-only
 * route: `?fixtures=migration-running` stays on the update screen, `?fixtures=migration-fails`
 * fails every update, `?fixtures=migration-fails-once` fails the first and lets Retry recover,
 * and `?fixtures=migration-fails-first-open` fails where there was nothing to update.
 */
type Simulation = "running" | "update-fails" | "open-fails" | null;

function simulation(attempt: number): Simulation {
	const search = globalThis.location?.search ?? "";
	const scenario = new URLSearchParams(search).get("fixtures");
	if (scenario === "migration-running") return "running";
	if (scenario === "migration-fails") return "update-fails";
	if (scenario === "migration-fails-once" && attempt === 0)
		return "update-fails";
	if (scenario === "migration-fails-first-open") return "open-fails";
	return null;
}

export function DatabaseProvider({
	children,
	copy,
}: PropsWithChildren<{ copy: DatabaseCopy }>) {
	const [attempt, setAttempt] = useState(0);
	const simulated = simulation(attempt);

	if (simulated === "running") return <MigrationScreen copy={copy.updating} />;
	if (simulated) {
		return (
			<DatabaseErrorScreen
				error={new Error("Simulated migration failure")}
				onRetry={() => setAttempt((n) => n + 1)}
				copy={
					simulated === "update-fails" ? copy.updateFailed : copy.openFailed
				}
			/>
		);
	}
	return children;
}
