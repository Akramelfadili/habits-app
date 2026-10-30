import { Pressable, StyleSheet, Text, View } from "react-native";
import { minTouchTarget, radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type StepperProps = {
	value: number;
	onChange: (value: number) => void;
	min: number;
	max: number;
	/** What the number counts, for screen readers ("times per week"). */
	accessibilityLabel: string;
	/** "large" is design-system.md's "large stepper" (Quantity Log, HAB-07). */
	size?: "default" | "large";
	/** The unit or the target under the value ("glasses a day", "of 8 glasses", V3-18). */
	caption?: string;
};

/** −/+ control around a center numeral; each side disables at its bound. */
export function Stepper({
	value,
	onChange,
	min,
	max,
	accessibilityLabel,
	size = "default",
	caption,
}: StepperProps) {
	const { colors, opacity } = useTheme();
	const isLarge = size === "large";

	function renderButton(symbol: "−" | "+", next: number, disabled: boolean) {
		return (
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={`${symbol === "+" ? "Increase" : "Decrease"} ${accessibilityLabel}`}
				accessibilityState={{ disabled }}
				disabled={disabled}
				onPress={() => onChange(next)}
				style={({ pressed }) => [
					isLarge ? styles.buttonLarge : styles.button,
					{ backgroundColor: colors.inner },
					disabled && { opacity: opacity.disabled },
					pressed && !disabled && { opacity: opacity.pressed },
				]}
			>
				<Text
					style={[
						isLarge ? styles.symbolLarge : styles.symbol,
						{ color: colors.ink },
					]}
				>
					{symbol}
				</Text>
			</Pressable>
		);
	}

	return (
		<View style={[styles.row, isLarge && styles.rowLarge]}>
			{renderButton("−", value - 1, value <= min)}
			<View style={styles.valueColumn}>
				<Text
					// Swipe up/down on the value to step it (VoiceOver / TalkBack), as well
					// as the −/+ buttons either side.
					accessible
					accessibilityRole="adjustable"
					accessibilityLabel={accessibilityLabel}
					accessibilityValue={{ min, max, now: value }}
					accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
					onAccessibilityAction={(event) => {
						if (event.nativeEvent.actionName === "increment" && value < max) {
							onChange(value + 1);
						}
						if (event.nativeEvent.actionName === "decrement" && value > min) {
							onChange(value - 1);
						}
					}}
					style={[
						isLarge ? styles.valueLarge : styles.value,
						{ color: colors.ink },
					]}
				>
					{value}
				</Text>
				{caption ? (
					<Text style={[styles.caption, { color: colors.sub }]}>{caption}</Text>
				) : null}
			</View>
			{renderButton("+", value + 1, value >= max)}
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: space[350],
	},
	rowLarge: {
		gap: space[500],
	},
	// T-11: the inline stepper's buttons are 44 pt like every other target.
	button: {
		width: minTouchTarget,
		height: minTouchTarget,
		borderRadius: radius.pill,
		alignItems: "center",
		justifyContent: "center",
	},
	buttonLarge: {
		width: minTouchTarget,
		height: minTouchTarget,
		borderRadius: radius.pill,
		alignItems: "center",
		justifyContent: "center",
	},
	symbol: {
		...textStyles.title,
	},
	symbolLarge: {
		...textStyles.title,
	},
	valueColumn: {
		alignItems: "center",
	},
	caption: {
		...textStyles.footnote,
		textAlign: "center",
	},
	value: {
		minWidth: space[500],
		textAlign: "center",
		...textStyles.bodyLg,
		fontWeight: "500",
	},
	valueLarge: {
		minWidth: space[800] + space[200],
		textAlign: "center",
		...textStyles.display,
	},
});
