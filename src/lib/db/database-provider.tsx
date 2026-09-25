import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { useDrizzleStudio } from "expo-drizzle-studio-plugin";
import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { db, expoDb } from "./client";
import migrations from "./migrations/migrations";

export function DatabaseProvider({ children }: PropsWithChildren) {
	const { success, error } = useMigrations(db, migrations);
	useDrizzleStudio(__DEV__ ? expoDb : null);

	if (error) {
		return (
			<View style={styles.center}>
				<Text>Database migration failed: {error.message}</Text>
			</View>
		);
	}

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
