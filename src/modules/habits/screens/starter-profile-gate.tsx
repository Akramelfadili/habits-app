import { type ReactNode, useEffect, useState } from "react";
import {
	applyStarterProfile,
	type StarterProfileResult,
} from "../services/starter-profile-service";

// One run per JS runtime: a remount (or React strict mode's double effect)
// must not apply twice.
let applying: Promise<StarterProfileResult> | undefined;

/**
 * Development builds only (docs/how-to/starter-habits.md). Renders nothing —
 * so the splash stays up — until the starter profile in `.env.local` has been
 * applied (or found absent, invalid or already applied). The root layout loads
 * this file only through `__DEV__ ? require(...)`, and Expo inlines the env
 * value here, so a production bundle contains neither. The architecture check
 * (rule `starter-profile-site`) keeps it that way.
 */
export function StarterProfileGate({ children }: { children: ReactNode }) {
	const [done, setDone] = useState(false);

	useEffect(() => {
		let active = true;
		// Never rejects; failures are logged inside the service.
		applying ??= applyStarterProfile(process.env.EXPO_PUBLIC_STARTER_PROFILE);
		void applying.then(() => {
			if (active) setDone(true);
		});
		return () => {
			active = false;
		};
	}, []);

	return done ? children : null;
}
