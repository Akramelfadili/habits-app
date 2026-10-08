import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/use-theme";

type SegmentedControlOption<T extends string> = {
	value: T;
	label: string;
	/** Just this segment is unavailable (e.g. a period with no data yet) — the others stay live. */
	disabled?: boolean;
};

type SegmentedControlProps<T extends string> = {
	/** Two options (Direction, Week), three (Appearance, HAB-15; the summaries' range switcher, HAB-16). */
	options:
		| [SegmentedControlOption<T>, SegmentedControlOption<T>]
		| [
				SegmentedControlOption<T>,
				SegmentedControlOption<T>,
				SegmentedControlOption<T>,
		  ];
	value: T;
	onChange: (value: T) => void;
	disabled?: boolean;
	/** "compact" hugs its labels so it can sit trailing in a row (Direction); default fills the width. */
	size?: "full" | "compact";
};

export function SegmentedControl<T extends string>({
	options,
	value,
	onChange,
	disabled = false,
	size = "full",
}: SegmentedControlProps<T>) {
	const { colors, opacity } = useTheme();

	return (
		<View
			style={[
				styles.track,
				size === "compact" && styles.trackCompact,
				{ backgroundColor: colors.inner },
			]}
		>
			{options.map((option) => {
				const isActive = option.value === value;
				const isDisabled = disabled || option.disabled === true;
				return (
					<Pressable
						key={option.value}
						accessibilityRole="button"
						accessibilityState={{ selected: isActive, disabled: isDisabled }}
						disabled={isDisabled}
						onPress={() => onChange(option.value)}
						style={[
							styles.segment,
							size === "compact" ? styles.segmentCompact : styles.segmentFull,
							isActive && { backgroundColor: colors.ink },
							isDisabled && { opacity: opacity.disabled },
						]}
					>
						<Text
							style={[
								styles.label,
								{ color: isActive ? colors.onAccent : colors.ink },
							]}
						>
							{option.label}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	track: {
		flexDirection: "row",
		borderRadius: 999,
		padding: 3,
	},
	trackCompact: {
		alignSelf: "flex-start",
	},
	segment: {
		borderRadius: 999,
		alignItems: "center",
	},
	segmentFull: {
		flex: 1,
		paddingVertical: 9,
	},
	segmentCompact: {
		paddingVertical: 6,
		paddingHorizontal: 14,
	},
	label: {
		fontSize: 13,
		fontWeight: "500",
	},
});
