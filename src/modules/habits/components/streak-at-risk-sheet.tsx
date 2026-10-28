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
	habitName: string;
	/** The streak standing before yesterday's miss — what a freeze would preserve. */
	currentStreak: number;
	/** Remaining in the shared monthly pool (HAB-33). At 0 the sheet is the one-button SR3 explanation. */
	freezesRemaining: number;
	/** Any date within the current month — only its month is used, for the "Resets on" caption. */
	today: Date;
	onUseFreeze: () => void;
	/** "Not now" (SR1) and SR3's "Got it": closes the sheet, writes nothing. */
	onNotNow: () => void;
	isApplyingFreeze?: boolean;
};

function freezeCountLabel(count: number): string {
	return `${pluralise(count, "freeze")} left`;
}

/**
 * Bottom sheet for the streak-at-risk decision (HAB-33, SR1/SR3): the pool row,
 * then — while a freeze is left — a primary "Use a freeze" and "Not now"; with
 * none left, one "Got it" and copy saying the streak restarts but the longest
 * streak is kept. Non-dismissible (per Sheet's own doc comment): this is a
 * decision, not a form, so a button is the only way out. Neither "Not now" nor
 * "Got it" writes anything.
 */
export function StreakAtRiskSheet({
	visible,
	habitName,
	currentStreak,
	freezesRemaining,
	today,
	onUseFreeze,
	onNotNow,
	isApplyingFreeze = false,
}: StreakAtRiskSheetProps) {
	const { colors } = useTheme();
	const resetsOn = format(addMonths(startOfMonth(today), 1), "d MMMM");
	const hasFreeze = freezesRemaining > 0;

	return (
		<Sheet visible={visible} onDismiss={() => {}} dismissible={false}>
			<View style={styles.copy}>
				<Text style={[styles.headline, { color: colors.ink }]}>
					{hasFreeze
						? `Keep your ${habitName} streak?`
						: "No freezes left this month"}
				</Text>
				<Text style={[styles.body, { color: colors.sub }]}>
					{hasFreeze
						? `You missed yesterday. Use a freeze to keep your ${currentStreak}-day streak, or let it go: it restarts with your next log.`
						: `You missed yesterday, so your ${currentStreak}-day streak for ${habitName} restarts with your next log. Your longest streak is kept. Freezes come back on ${resetsOn}.`}
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

			{hasFreeze ? (
				<>
					<Button
						label="Use a freeze"
						onPress={onUseFreeze}
						loading={isApplyingFreeze}
					/>
					<Button
						label="Not now"
						variant="secondary"
						onPress={onNotNow}
						disabled={isApplyingFreeze}
					/>
				</>
			) : (
				<Button label="Got it" onPress={onNotNow} />
			)}
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
