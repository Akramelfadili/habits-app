import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { useDrizzleStudio } from "expo-drizzle-studio-plugin";
import { type PropsWithChildren, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { log } from "@/lib/logger/logger";
import { db, expoDb } from "./client";
import { DatabaseErrorScreen } from "./database-error-screen";
import migrations from "./migrations/migrations";
import { SCHEMA_VERSION } from "./schema-version";

/**
 * Runs the migrations before anything reads the database. A failure shows the
 * error screen with Retry (audit A3-01). The migrator is one atomic
 * transaction, so a failed run leaves the old schema intact; Retry re-runs it
 * on a fresh mount (`useMigrations` only runs once per mount), which mainly
 * helps with transient errors.
 */
export function DatabaseProvider({ children }: PropsWithChildren) {
	const [attempt, setAttempt] = useState(0);
	return (
		<MigrationGate key={attempt} onRetry={() => setAttempt((n) => n + 1)}>
			{children}
		</MigrationGate>
	);
}

function MigrationGate({
	children,
	onRetry,
}: PropsWithChildren<{ onRetry: () => void }>) {
	const { success, error } = useMigrations(db, migrations);
	useDrizzleStudio(__DEV__ ? expoDb : null);

	useEffect(() => {
		if (success) {
			log.info("db", "migrations applied", { schemaVersion: SCHEMA_VERSION });
		}
	}, [success]);

	if (error) return <DatabaseErrorScreen error={error} onRetry={onRetry} />;

	if (!success) {
		return (
			<View style={styles.center}>
				<Text>Loading…</Text>
			</View>
		);
	}

	return children;
}

const styles = StyleSheet.create({
	center: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
});
