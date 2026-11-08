import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ErrorScreen } from "@/components/ui/composite/error-screen";
import { log } from "@/lib/logger/logger";
import type { DatabaseCopy } from "./database-copy";

/**
 * Audit C-07: the stored data was written by a newer build than this one
 * (an older TestFlight build installed over a newer one). Nothing here opens,
 * migrates or writes it — there is no Try again, because trying again cannot
 * help — and the only way on is to update the app. Copy diagnostics stays so
 * support can see what happened. The splash is dropped like the other
 * recovery screens, or the app would sit on it.
 */
export function NewerDatabaseScreen({ copy }: { copy: DatabaseCopy["newer"] }) {
	useEffect(() => {
		log.warn("database.newer_blocked", { plan: "newer" });
		SplashScreen.hide();
	}, []);

	return <ErrorScreen title={copy.title} message={copy.message} />;
}
