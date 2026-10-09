import { useEffect } from "react";
import { reconcileScheduledReminders } from "../services/reminder-reconcile-service";

let started = false;

/**
 * Work that runs once per launch, after the database is ready: bringing the
 * OS's scheduled reminders back in line with it (audit A3-05). Mounted once by
 * the root layout; a remount (or a return to the foreground) does not run it
 * again — the module-level flag lives as long as the JS runtime does.
 */
export function useStartupActions(): void {
	useEffect(() => {
		if (started) return;
		started = true;
		// Never rejects; failures are logged inside.
		void reconcileScheduledReminders();
	}, []);
}
