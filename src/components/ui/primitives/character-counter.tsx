import { StyleSheet, Text } from "react-native";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

/** The counter appears from this fraction of the limit onward (design-system-v2 NEW-23). */
export const COUNTER_FROM_RATIO = 0.8;

/** The first length at which a counter for `limit` shows — 16 of 20, 26 of 32. */
export function counterThreshold(limit: number): number {
	return Math.ceil(limit * COUNTER_FROM_RATIO);
}

type CharacterCounterProps = {
	length: number;
	limit: number;
};

/**
 * NEW-23 character counter — shared by the habit-name and category-name
 * fields. Hidden below 80% of the limit so normal typing isn't cluttered;
 * amber once the limit is reached (the field itself stops accepting more).
 */
export function CharacterCounter({ length, limit }: CharacterCounterProps) {
	const { colors } = useTheme();
	if (length < counterThreshold(limit)) return null;
	const atLimit = length >= limit;

	return (
		<Text
			accessibilityLiveRegion="polite"
			accessibilityLabel={`${length} of ${limit} characters`}
			style={[
				styles.counter,
				{ color: atLimit ? colors.warnInk : colors.faint },
			]}
		>
			{`${length}/${limit}`}
		</Text>
	);
}

const styles = StyleSheet.create({
	counter: {
		fontSize: typeScale.caption,
		fontVariant: ["tabular-nums"],
	},
});
