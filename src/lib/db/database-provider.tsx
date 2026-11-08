import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { type PropsWithChildren, useEffect, useMemo, useState } from "react";
import { log } from "@/lib/logger/logger";
import { db, expoDb, getDatabaseOpenError, retryOpenDatabase } from "./client";
import type { DatabaseCopy } from "./database-copy";
import { DatabaseErrorScreen } from "./database-error-screen";
import {
	MIGRATION_SCREEN_PAINT_MS,
	type MigrationPlan,
	planMigrations,
} from "./migration-plan";
import { MigrationScreen } from "./migration-screen";
import migrations from "./migrations/migrations";
import { SCHEMA_VERSION } from "./schema-version";

type DatabaseProviderProps = PropsWithChildren<{ copy: DatabaseCopy }>;

// Drizzle Studio is a dev-only tool (a dev-server connection to the DB), so the
// plugin is a devDependency and a `__DEV__ ? require(...)` keeps it out of a
// production bundle (audit D-10). `__DEV__` is constant per bundle, so the
// no-op stand-in never changes the hook-call order within one build.
const useDrizzleStudio: (database: typeof expoDb) => void = __DEV__
	? require("expo-drizzle-studio-plugin").useDrizzleStudio
	: () => {};

/**
 * Runs the migrations before anything reads the database. A failure shows the
 * error screen with Retry (audit A3-01, SY4). The migrator is one atomic
 * transaction, so a failed run leaves the old schema and every row intact;
 * Retry re-runs it on a fresh mount (`useMigrations` only runs once per mount),
 * which mainly helps with transient errors.
 *
 * On the first launch after an update the update screen (SY3) is up before the
 * migrator starts. It does not change what the migrator does — only when it
 * begins, a moment later, so the screen can be painted before the JavaScript
 * thread is busy.
 */
export function DatabaseProvider({ children, copy }: DatabaseProviderProps) {
	const [attempt, setAttempt] = useState(0);
	// The file could not be opened at all: nothing below can run, so say so
	// here (the failure was logged by the client) instead of crashing.
	if (getDatabaseOpenError() !== null) {
		return (
			<DatabaseErrorScreen
				error={getDatabaseOpenError()}
				copy={copy.openFailed}
				onRetry={() => {
					retryOpenDatabase();
					setAttempt((n) => n + 1);
				}}
			/>
		);
	}
	return (
		<MigrationGate
			key={attempt}
			copy={copy}
			onRetry={() => setAttempt((n) => n + 1)}
		>
			{children}
		</MigrationGate>
	);
}

/** The newest `when` in the journal: what the migrator compares the last applied row against. */
function newestMigrationAt(): number {
	return migrations.journal.entries.reduce(
		(newest, entry) => Math.max(newest, entry.when),
		0,
	);
}

function MigrationGate({
	children,
	copy,
	onRetry,
}: DatabaseProviderProps & { onRetry: () => void }) {
	const plan = useMemo(() => planMigrations(expoDb, newestMigrationAt()), []);
	const [started, setStarted] = useState(plan !== "upgrade");

	useEffect(() => {
		if (started) return;
		const timer = setTimeout(() => setStarted(true), MIGRATION_SCREEN_PAINT_MS);
		return () => clearTimeout(timer);
	}, [started]);

	if (!started) return <MigrationScreen copy={copy.updating} />;
	return (
		<RunMigrations plan={plan} copy={copy} onRetry={onRetry}>
			{children}
		</RunMigrations>
	);
}

function RunMigrations({
	children,
	copy,
	plan,
	onRetry,
}: DatabaseProviderProps & { plan: MigrationPlan; onRetry: () => void }) {
	const { success, error } = useMigrations(db, migrations);
	useDrizzleStudio(expoDb);

	useEffect(() => {
		log.info("migration.start", { schemaVersion: SCHEMA_VERSION, plan });
	}, [plan]);

	useEffect(() => {
		if (success) {
			log.info("migration.success", { schemaVersion: SCHEMA_VERSION });
		}
	}, [success]);

	if (error) {
		return (
			<DatabaseErrorScreen
				error={error}
				onRetry={onRetry}
				copy={plan === "upgrade" ? copy.updateFailed : copy.openFailed}
			/>
		);
	}

	// Splash still covers a launch with nothing to show; an update keeps its screen up.
	if (!success) {
		return plan === "upgrade" ? <MigrationScreen copy={copy.updating} /> : null;
	}

	return children;
}
