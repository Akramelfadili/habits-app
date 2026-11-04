import { addMonths, format, startOfMonth } from "date-fns";
import { useRef } from "react";
import { type HostInstance, StyleSheet, Text, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { Sheet } from "@/components/ui/composite/sheet";
import { Button } from "@/components/ui/primitives/button";
import { space, squareRadius, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { pluralise } from "@/utils/format";
import { useInitialFocus } from "@/utils/use-initial-focus";
import { FREEZE_POOL_SIZE } from "../constants";
import { todayCopy } from "../messages";

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
	// 08.3: focus starts on the action the sheet leans towards.
	const primaryRef = useRef<HostInstance>(null);
	useInitialFocus(primaryRef, visible);
	const title = hasFreeze
		? todayCopy.atRiskTitle(habitName)
		: todayCopy.atRiskTitleNone;

	return (
		<Sheet visible={visible} onDismiss={() => {}} dismissible={false}>
			<View style={styles.copy}>
				<Text
					accessibilityRole="header"
					accessibilityLabel={`${title}. ${freezeCountLabel(freezesRemaining)}.`}
					style={[styles.headline, { color: colors.ink }]}
				>
					{title}
				</Text>
				<Text style={[styles.body, { color: colors.sub }]}>
					{hasFreeze
						? todayCopy.atRiskBody(currentStreak)
						: todayCopy.atRiskBodyNone(currentStreak, habitName, resetsOn)}
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
							{todayCopy.atRiskResetsOn(resetsOn)}
						</Text>
					</View>
				</View>
			</Container>

			{hasFreeze ? (
				<>
					<Button
						buttonRef={primaryRef}
						label={todayCopy.atRiskUseFreeze}
						onPress={onUseFreeze}
						loading={isApplyingFreeze}
					/>
					<Button
						label={todayCopy.atRiskNotNow}
						variant="secondary"
						onPress={onNotNow}
						disabled={isApplyingFreeze}
					/>
				</>
			) : (
				<Button
					buttonRef={primaryRef}
					label={todayCopy.atRiskGotIt}
					onPress={onNotNow}
				/>
			)}
		</Sheet>
	);
}

/** The pool's pips are 28 pt squares, the violet freeze token (D5). */
const PIP = 28;

const styles = StyleSheet.create({
	copy: {
		gap: space[100],
		paddingHorizontal: space[100],
	},
	headline: {
		...textStyles.title,
	},
	body: {
		...textStyles.callout,
	},
	poolRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: space[300],
	},
	pips: {
		flexDirection: "row",
		gap: space[150],
	},
	pip: {
		width: PIP,
		height: PIP,
		borderRadius: squareRadius(PIP),
	},
	poolText: {
		flex: 1,
		gap: space[50],
	},
	poolCount: {
		...textStyles.callout,
		fontWeight: "500",
	},
	poolCaption: {
		...textStyles.caption,
	},
});
