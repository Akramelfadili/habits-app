import { Button } from "@/components/ui/primitives/button";
import type { useTodayDevActions } from "../../hooks/use-today-dev-actions";

type TodayDevButtonsProps = {
	dev: ReturnType<typeof useTodayDevActions>;
	/** The populated list also offers "Clear all"; the empty state has nothing to clear. */
	withClearAll?: boolean;
};

/** The dev-only seed / clear / reset buttons — each renders only when its action exists (`__DEV__`). */
export function TodayDevButtons({
	dev,
	withClearAll = false,
}: TodayDevButtonsProps) {
	return (
		<>
			{withClearAll && dev.clearAll ? (
				<Button
					label="Clear all habits (dev)"
					variant="ghost"
					fullWidth={false}
					disabled={dev.isClearingAll}
					onPress={dev.clearAll}
				/>
			) : null}
			{dev.seedStreakAtRisk ? (
				<Button
					label="Seed streak-at-risk habit (dev)"
					variant="ghost"
					fullWidth={false}
					disabled={dev.isSeedingStreakAtRisk}
					onPress={dev.seedStreakAtRisk}
				/>
			) : null}
			{dev.seedHistory ? (
				<Button
					label="Seed habit with history (dev)"
					variant="ghost"
					fullWidth={false}
					disabled={dev.isSeedingHistory}
					onPress={dev.seedHistory}
				/>
			) : null}
			{dev.resetFirstRun ? (
				<Button
					label="Reset First Run (dev)"
					variant="ghost"
					fullWidth={false}
					disabled={dev.isResetting}
					onPress={dev.resetFirstRun}
				/>
			) : null}
		</>
	);
}
