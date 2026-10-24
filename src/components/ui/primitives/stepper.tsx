import { Pressable, StyleSheet, Text, View } from "react-native";
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
};

/** −/+ control around a center numeral; each side disables at its bound. */
export function Stepper({
	value,
	onChange,
	min,
	max,
	accessibilityLabel,
	size = "default",
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
				hitSlop={6}
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
			{renderButton("+", value + 1, value >= max)}
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
	},
	rowLarge: {
		gap: 20,
	},
	button: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	buttonLarge: {
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: "center",
		justifyContent: "center",
	},
	symbol: {
		fontSize: 18,
		fontWeight: "500",
	},
	symbolLarge: {
		fontSize: 22,
		fontWeight: "500",
	},
	value: {
		minWidth: 20,
		textAlign: "center",
		fontSize: 17,
		fontWeight: "500",
	},
	valueLarge: {
		minWidth: 36,
		textAlign: "center",
		fontSize: 32,
		fontWeight: "600",
	},
});
