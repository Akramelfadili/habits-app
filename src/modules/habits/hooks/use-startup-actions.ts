import { useEffect } from "react";
import { clearExports } from "@/lib/file-export/file-export";
import { log } from "@/lib/logger/logger";
import { reconcileScheduledReminders } from "../services/reminder-reconcile-service";

let started = false;

// Once per launch: the module-level flag outlives remounts and foreground returns.
export function useStartupActions(): void {
	useEffect(() => {
		if (started) return;
		started = true;
		void reconcileScheduledReminders();
		try {
			clearExports();
		} catch (error) {
			// Housekeeping: logged, never shown.
			log.warn("export.cleanup_failed", { error });
		}
	}, []);
}
