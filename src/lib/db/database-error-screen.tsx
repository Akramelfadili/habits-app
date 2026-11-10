import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { DestructiveConfirmSheet } from "@/components/ui/composite/destructive-confirm-sheet";
import { ErrorScreen } from "@/components/ui/composite/error-screen";
import { log } from "@/lib/logger/logger";
import type { DatabaseCopy } from "./database-copy";
import type { RecoveryState } from "./recovery-state";
import { SCHEMA_VERSION } from "./schema-version";

/** What the screen needs to offer "set aside old data"; omitted before the second failure. */
export type SetAsideControls = {
	copy: DatabaseCopy["setAside"];
	sheet: RecoveryState["sheet"];
	onAsk: () => void;
	onCancel: () => void;
	onConfirm: () => void;
};

type DatabaseErrorScreenProps = {
	error: unknown;
	onRetry: () => void;
	/** The update-failed words when an update failed; the plain open-failure words otherwise. */
	copy: DatabaseCopy["updateFailed"] | DatabaseCopy["openFailed"];
	setAside?: SetAsideControls;
};

/**
 * What a failed database open or migration shows. The splash is held until the saved Appearance
 * choice loads, which needs the database, so on failure it has to be hidden here or the app
 * would sit on it forever. The migrator runs in one transaction, so a failed run leaves the old
 * schema and every row as they were: the update copy says so because it is true.
 *
 * From the second failure in a row it also offers "Set aside old data and start fresh", behind a
 * destructive-style confirm that says the old file is kept on the phone.
 */
export function DatabaseErrorScreen({
	error,
	onRetry,
	copy,
	setAside,
}: DatabaseErrorScreenProps) {
	useEffect(() => {
		log.error("migration.failure", { schemaVersion: SCHEMA_VERSION, error });
		SplashScreen.hide();
	}, [error]);

	return (
		<>
			<ErrorScreen
				title={copy.title}
				message={copy.message}
				reason={"reason" in copy ? copy.reason : undefined}
				onRetry={onRetry}
				recovery={
					setAside
						? {
								label: setAside.copy.action,
								hint: setAside.copy.hint,
								onPress: setAside.onAsk,
							}
						: undefined
				}
			/>
			{setAside ? (
				<DestructiveConfirmSheet
					visible={setAside.sheet !== "closed"}
					headline={setAside.copy.confirm.headline}
					body={setAside.copy.confirm.body}
					confirmLabel={setAside.copy.confirm.confirmLabel}
					confirmHint={setAside.copy.confirm.confirmHint}
					busy={setAside.copy.confirm.busy}
					error={
						setAside.sheet === "error" ? setAside.copy.confirm.error : undefined
					}
					cancelLabel={setAside.copy.confirm.cancelLabel}
					onCancel={setAside.onCancel}
					onConfirm={setAside.onConfirm}
					isWorking={setAside.sheet === "working"}
				/>
			) : null}
		</>
	);
}
