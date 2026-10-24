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
	/** Names the group for a screen reader — "Direction", "Appearance". */
	label?: string;
};

export function SegmentedControl<T extends string>({
	options,
	value,
	onChange,
	disabled = false,
	size = "full",
	label,
}: SegmentedControlProps<T>) {
	const { colors, opacity } = useTheme();

	return (
		<View
			accessibilityRole="tablist"
			accessibilityLabel={label}
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
						accessibilityRole="tab"
						accessibilityState={{ selected: isActive, disabled: isDisabled }}
						disabled={isDisabled}
						onPress={() => onChange(option.value)}
						style={[
							styles.segment,
							size === "full" && styles.segmentFull,
							isDisabled && { opacity: opacity.disabled },
						]}
					>
						<View
							style={[
								styles.pill,
								size === "compact" && styles.pillCompact,
								isActive && { backgroundColor: colors.ink },
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
						</View>
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
	},
	trackCompact: {
		alignSelf: "flex-start",
	},
	// Each segment is a 44pt-tall touch column filling the track edge to edge,
	// so segments abut and never overlap; the pill inside keeps the 3pt inset.
	segment: {
		minHeight: 44,
		justifyContent: "center",
		padding: 3,
	},
	segmentFull: {
		flex: 1,
	},
	pill: {
		flex: 1,
		borderRadius: 999,
		alignItems: "center",
		justifyContent: "center",
	},
	pillCompact: {
		paddingHorizontal: 14,
	},
	label: {
		fontSize: 13,
		fontWeight: "500",
	},
});
