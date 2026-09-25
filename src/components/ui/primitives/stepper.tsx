import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/use-theme";

type StepperProps = {
	value: number;
	onChange: (value: number) => void;
	min: number;
	max: number;
	/** What the number counts, for screen readers ("times per week"). */
	accessibilityLabel: string;
};

/** −/+ control around a center numeral; each side disables at its bound. */
export function Stepper({
	value,
	onChange,
	min,
	max,
	accessibilityLabel,
}: StepperProps) {
	const { colors, opacity } = useTheme();

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
					styles.button,
					{ backgroundColor: colors.inner },
					disabled && { opacity: opacity.disabled },
					pressed && !disabled && { opacity: opacity.pressed },
				]}
			>
				<Text style={[styles.symbol, { color: colors.ink }]}>{symbol}</Text>
			</Pressable>
		);
	}

	return (
		<View style={styles.row}>
			{renderButton("−", value - 1, value <= min)}
			<Text
				accessibilityLabel={`${value} ${accessibilityLabel}`}
				style={[styles.value, { color: colors.ink }]}
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
	button: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	symbol: {
		fontSize: 18,
		fontWeight: "500",
	},
	value: {
		minWidth: 20,
		textAlign: "center",
		fontSize: 17,
		fontWeight: "500",
	},
});
