import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ErrorScreen } from "@/components/ui/composite/error-screen";
import { log } from "@/lib/logger/logger";
import type { DatabaseCopy } from "./database-copy";
import { SCHEMA_VERSION } from "./schema-version";

type DatabaseErrorScreenProps = {
	error: unknown;
	onRetry: () => void;
	/** SY4's words when an update failed; the plain open-failure words otherwise. */
	copy: DatabaseCopy["updateFailed"] | DatabaseCopy["openFailed"];
};

/**
 * What a failed database open or migration shows (audit A3-01, SY4). The splash
 * is held until the saved Appearance choice loads — which needs the database —
 * so on failure it has to be hidden here or the app would sit on it forever.
 * The migrator runs in one transaction, so a failed run leaves the old schema
 * and every row as they were: the update copy says so because it is true.
 */
export function DatabaseErrorScreen({
	error,
	onRetry,
	copy,
}: DatabaseErrorScreenProps) {
	useEffect(() => {
		log.error("migration.failure", { schemaVersion: SCHEMA_VERSION, error });
		SplashScreen.hide();
	}, [error]);

	return (
		<ErrorScreen
			title={copy.title}
			message={copy.message}
			reason={"reason" in copy ? copy.reason : undefined}
			onRetry={onRetry}
		/>
	);
}
