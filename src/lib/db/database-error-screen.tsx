import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ErrorScreen } from "@/components/ui/composite/error-screen";
import { log } from "@/lib/logger/logger";
import { SCHEMA_VERSION } from "./schema-version";

type DatabaseErrorScreenProps = {
	error: Error;
	onRetry: () => void;
};

/**
 * What a failed database open/migration shows (audit A3-01). The splash is
 * held until the saved Appearance choice loads — which needs the database —
 * so on failure it has to be hidden here or the app would sit on it forever.
 */
export function DatabaseErrorScreen({
	error,
	onRetry,
}: DatabaseErrorScreenProps) {
	useEffect(() => {
		log.error("db", "migration failed", error, {
			schemaVersion: SCHEMA_VERSION,
		});
		SplashScreen.hide();
	}, [error]);

	return (
		<ErrorScreen
			title="Couldn't open your data"
			message="The app couldn't prepare its database. Nothing was lost. Try again, and if it keeps happening, copy the diagnostics and send them over."
			onRetry={onRetry}
		/>
	);
}
