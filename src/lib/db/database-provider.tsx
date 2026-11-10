import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import {
	type PropsWithChildren,
	type RefObject,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "react";
import { log } from "@/lib/logger/logger";
import {
	db,
	expoDb,
	getDatabaseOpenError,
	retryOpenDatabase,
	setAsideDatabase,
} from "./client";
import { backupBeforeMigrating } from "./database-backup";
import type { DatabaseCopy } from "./database-copy";
import {
	DatabaseErrorScreen,
	type SetAsideControls,
} from "./database-error-screen";
import { createBackupFiles } from "./database-files";
import { errorNameOf } from "./error-name";
import {
	MIGRATION_SCREEN_PAINT_MS,
	type MigrationPlan,
	planMigrations,
} from "./migration-plan";
import { MigrationScreen } from "./migration-screen";
import migrations from "./migrations/migrations";
import { NewerDatabaseScreen } from "./newer-database-screen";
import {
	canSetAside,
	INITIAL_RECOVERY,
	recoveryReducer,
} from "./recovery-state";
import { SCHEMA_VERSION } from "./schema-version";

type DatabaseProviderProps = PropsWithChildren<{ copy: DatabaseCopy }>;

// Drizzle Studio is a dev-only tool (a dev-server connection to the DB), so the plugin is a
// devDependency and a `__DEV__ ? require(...)` keeps it out of a production bundle. `__DEV__` is
// constant per bundle, so the no-op stand-in never changes the hook-call order within one build.
const useDrizzleStudio: (database: typeof expoDb) => void = __DEV__
	? require("expo-drizzle-studio-plugin").useDrizzleStudio
	: () => {};

/**
 * Runs the migrations before anything reads the database. A failure shows the error screen with
 * Retry. The migrator is one atomic transaction, so a failed run leaves the old schema and every
 * row intact; Retry re-runs it on a fresh mount (`useMigrations` only runs once per mount), which
 * mainly helps with transient errors.
 *
 * On the first launch after an update the update screen is up before the migrator starts. It does
 * not change what the migrator does, only when it begins, a moment later, so the screen can be
 * painted before the JavaScript thread is busy. In that moment a backup of the old database is
 * taken (`database-backup.ts`).
 */
export function DatabaseProvider({ children, copy }: DatabaseProviderProps) {
	const [attempt, setAttempt] = useState(0);
	const [recovery, dispatch] = useReducer(recoveryReducer, INITIAL_RECOVERY);
	// One backup per launch: Try again re-mounts the gate with the same data,
	// and a copy per retry would push the older, different backups out.
	const backupTaken = useRef(false);

	function retry() {
		dispatch({ type: "retry" });
		if (getDatabaseOpenError() !== null) retryOpenDatabase();
		setAttempt((n) => n + 1);
	}

	function confirmSetAside() {
		dispatch({ type: "confirm" });
		// A beat for the "working" state to be painted: the rename and reopen are synchronous.
		setTimeout(() => {
			try {
				setAsideDatabase(Date.now());
				dispatch({ type: "done" });
				setAttempt((n) => n + 1);
			} catch (error) {
				log.error("database.set_aside_failed", {
					errorName: errorNameOf(error),
				});
				dispatch({ type: "failed" });
			}
		}, MIGRATION_SCREEN_PAINT_MS);
	}

	const setAside: SetAsideControls | undefined = canSetAside(recovery)
		? {
				copy: copy.setAside,
				sheet: recovery.sheet,
				onAsk: () => dispatch({ type: "ask" }),
				onCancel: () => dispatch({ type: "cancel" }),
				onConfirm: confirmSetAside,
			}
		: undefined;

	// The file could not be opened at all: nothing below can run, so say so
	// here (the failure was logged by the client) instead of crashing.
	if (getDatabaseOpenError() !== null) {
		return (
			<DatabaseErrorScreen
				error={getDatabaseOpenError()}
				copy={copy.openFailed}
				onRetry={retry}
				setAside={setAside}
			/>
		);
	}
	return (
		<MigrationGate
			key={attempt}
			copy={copy}
			backupTaken={backupTaken}
			onRetry={retry}
			setAside={setAside}
		>
			{children}
		</MigrationGate>
	);
}

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
	backupTaken,
	setAside,
}: DatabaseProviderProps & {
	onRetry: () => void;
	backupTaken: RefObject<boolean>;
	setAside: SetAsideControls | undefined;
}) {
	const plan = useMemo(() => planMigrations(expoDb, newestMigrationAt()), []);
	const [started, setStarted] = useState(plan !== "upgrade");

	useEffect(() => {
		if (started) return;
		const timer = setTimeout(() => {
			// Upgrade plan only (this effect never runs for another). A failed
			// backup is logged and does not stop the update: the migrator is one
			// atomic transaction (docs/how-to/backups-and-recovery.md).
			if (!backupTaken.current) {
				backupTaken.current = true;
				backupBeforeMigrating(
					expoDb,
					() => createBackupFiles(expoDb.databasePath),
					Date.now(),
				);
			}
			setStarted(true);
		}, MIGRATION_SCREEN_PAINT_MS);
		return () => clearTimeout(timer);
	}, [started, backupTaken]);

	// Never run the migrator, or write anything, on data made by a newer build.
	if (plan === "newer") return <NewerDatabaseScreen copy={copy.newer} />;
	// Nor on a file that could not be read: it is a failure like any other, with
	// the same Try again and, from the second one, the way out.
	if (plan === "unreadable") {
		return (
			<DatabaseErrorScreen
				error={new Error("database unreadable")}
				copy={copy.openFailed}
				onRetry={onRetry}
				setAside={setAside}
			/>
		);
	}
	if (!started) return <MigrationScreen copy={copy.updating} />;
	return (
		<RunMigrations
			plan={plan}
			copy={copy}
			onRetry={onRetry}
			setAside={setAside}
		>
			{children}
		</RunMigrations>
	);
}

function RunMigrations({
	children,
	copy,
	plan,
	onRetry,
	setAside,
}: DatabaseProviderProps & {
	plan: MigrationPlan;
	onRetry: () => void;
	setAside: SetAsideControls | undefined;
}) {
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
				setAside={setAside}
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
