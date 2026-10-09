import { addMonths, format, startOfMonth } from "date-fns";
import { StyleSheet, Text, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { Sheet } from "@/components/ui/composite/sheet";
import { Button } from "@/components/ui/primitives/button";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { pluralise } from "@/utils/format";
import { FREEZE_POOL_SIZE } from "../constants";

type StreakAtRiskSheetProps = {
	visible: boolean;
	/** The streak standing before yesterday's miss — what a freeze would preserve. */
	currentStreak: number;
	/** Remaining in the shared monthly pool (HAB-08) — always ≥ 1 while this sheet is showing. */
	freezesRemaining: number;
	/** Any date within the current month — only its month is used, for the "Resets on" caption. */
	today: Date;
	onUseFreeze: () => void;
	onReset: () => void;
	isApplyingFreeze?: boolean;
};

function freezeCountLabel(count: number): string {
	return `${pluralise(count, "freeze")} left`;
}

/**
 * Bottom sheet for HAB-08's streak-at-risk decision — design-system.md's
 * "Streak at risk": habit context comes from the dimmed Today background
 * (the sheet's own copy is habit-agnostic, per docs/mockups/streak-at-risk.png),
 * headline, freeze-pool row, primary "Use a freeze" / secondary "Reset and
 * start today". Non-dismissible (per Sheet's own doc comment) — one of the
 * two buttons is the only way out, since this is a decision, not a form.
 */
export function StreakAtRiskSheet({
	visible,
	currentStreak,
	freezesRemaining,
	today,
	onUseFreeze,
	onReset,
	isApplyingFreeze = false,
}: StreakAtRiskSheetProps) {
	const { colors } = useTheme();
	const resetsOn = format(addMonths(startOfMonth(today), 1), "d MMMM");

	return (
		<Sheet visible={visible} onDismiss={() => {}} dismissible={false}>
			<View style={styles.copy}>
				<Text style={[styles.headline, { color: colors.ink }]}>
					You missed yesterday
				</Text>
				<Text style={[styles.body, { color: colors.sub }]}>
					{`Use a freeze to keep your ${currentStreak}-day streak, or let it reset and start again today. Either is fine.`}
				</Text>
			</View>

			<Container>
				<View style={styles.poolRow}>
					<View style={styles.pips}>
						{Array.from({ length: FREEZE_POOL_SIZE }, (_, index) => (
							<View
								// biome-ignore lint/suspicious/noArrayIndexKey: a fixed-size, order-only row of pool slots
								key={index}
								style={[
									styles.pip,
									{
										backgroundColor:
											index < freezesRemaining ? colors.frozenBg : colors.inner,
									},
								]}
							/>
						))}
					</View>
					<View style={styles.poolText}>
						<Text style={[styles.poolCount, { color: colors.ink }]}>
							{freezeCountLabel(freezesRemaining)}
						</Text>
						<Text style={[styles.poolCaption, { color: colors.sub }]}>
							{`Resets on ${resetsOn}`}
						</Text>
					</View>
				</View>
			</Container>

			<Button
				label="Use a freeze"
				onPress={onUseFreeze}
				loading={isApplyingFreeze}
			/>
			<Button
				label="Reset and start today"
				variant="secondary"
				onPress={onReset}
				disabled={isApplyingFreeze}
			/>
		</Sheet>
	);
}

const styles = StyleSheet.create({
	copy: {
		gap: 4,
		paddingHorizontal: 4,
	},
	headline: {
		fontSize: typeScale.section,
		fontWeight: "600",
	},
	body: {
		fontSize: typeScale.rowLabel,
	},
	poolRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	pips: {
		flexDirection: "row",
		gap: 6,
	},
	pip: {
		width: 28,
		height: 28,
		borderRadius: 8,
	},
	poolText: {
		flex: 1,
		gap: 2,
	},
	poolCount: {
		fontSize: typeScale.rowLabel,
		fontWeight: "500",
	},
	poolCaption: {
		fontSize: typeScale.caption,
	},
});
