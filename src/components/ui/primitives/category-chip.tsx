import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";
import {
	iconSize,
	minTouchTarget,
	radius,
	space,
	textStyles,
} from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

export type CategoryChipState =
	| "unselected"
	| "selected"
	| "add"
	| "preview"
	| "locked";

type CategoryChipProps = {
	label: string;
	state: CategoryChipState;
	symbol?: SFSymbol;
	accent?: { tint: string; ink: string };
	onPress?: () => void;
	size?: "default" | "compact";
};

// Kept separate from `Chip` on purpose: it uses the category's own color. Long labels truncate so a 2-up grid stays aligned.
export function CategoryChip({
	label,
	state,
	symbol,
	accent,
	onPress,
	size = "default",
}: CategoryChipProps) {
	const { colors, opacity } = useTheme();
	const isSelected = state === "selected";
	const isAdd = state === "add";
	const isLocked = state === "locked";
	const isStatic = state === "preview" || isLocked || onPress === undefined;
	const isCompact = size === "compact";
	const ink = accent?.ink ?? colors.sub;
	const tint = accent?.tint ?? colors.inner;

	const iconBackground = isSelected
		? colors.card
		: isAdd
			? colors.inner
			: isLocked
				? "transparent"
				: tint;
	const iconColor = isSelected ? colors.ink : isAdd ? colors.sub : ink;
	const labelColor = isSelected
		? colors.onAccent
		: isAdd
			? colors.sub
			: colors.ink;

	const content = (
		<>
			<View
				style={[
					styles.icon,
					isCompact && styles.compactIcon,
					{ backgroundColor: iconBackground },
				]}
			>
				<SymbolView
					name={isAdd ? "plus" : (symbol ?? "circle")}
					size={isCompact ? 10 : 11}
					tintColor={iconColor}
				/>
			</View>
			<Text
				numberOfLines={1}
				ellipsizeMode="tail"
				style={[
					styles.label,
					isCompact && styles.compactLabel,
					// Grid chips stretch the label so the selected check sits at the far edge.
					isStatic ? styles.labelHug : styles.labelFill,
					{ color: labelColor },
				]}
			>
				{label}
			</Text>
			{isSelected ? (
				<SymbolView
					name="checkmark"
					size={iconSize.xs}
					tintColor={colors.onAccent}
				/>
			) : null}
		</>
	);

	const chipStyle = [
		styles.chip,
		isCompact && styles.compactChip,
		{ backgroundColor: colors.card, borderColor: colors.border },
		isSelected && {
			backgroundColor: colors.accent,
			borderColor: colors.accent,
		},
		isAdd && styles.add,
		isAdd && { backgroundColor: "transparent", borderColor: colors.outline },
		isLocked && { backgroundColor: tint, borderColor: tint },
	];

	if (isStatic) {
		return (
			<View
				testID="category-chip"
				accessible
				accessibilityLabel={label}
				style={[chipStyle, styles.hug]}
			>
				{content}
			</View>
		);
	}

	return (
		<Pressable
			testID="category-chip"
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{ selected: isSelected }}
			onPress={onPress}
			style={({ pressed }) => [
				styles.touch,
				pressed && { opacity: opacity.pressed },
			]}
		>
			<View testID="category-chip-pill" style={chipStyle}>
				{content}
			</View>
		</Pressable>
	);
}

const ICON = 24;
const COMPACT_ICON = 20;

const styles = StyleSheet.create({
	touch: {
		minHeight: minTouchTarget,
		justifyContent: "center",
	},
	chip: {
		flexDirection: "row",
		alignItems: "center",
		gap: space[200],
		minHeight: 36,
		borderRadius: radius.pill,
		borderWidth: 1,
		paddingLeft: space[150],
		paddingRight: space[300],
		paddingVertical: space[100],
	},
	compactChip: {
		minHeight: 28,
		gap: space[150],
		paddingLeft: space[100],
		paddingRight: space[250],
		paddingVertical: space[50],
	},
	add: {
		borderStyle: "dashed",
	},
	hug: {
		alignSelf: "flex-start",
	},
	icon: {
		width: ICON,
		height: ICON,
		borderRadius: ICON / 2,
		alignItems: "center",
		justifyContent: "center",
	},
	compactIcon: {
		width: COMPACT_ICON,
		height: COMPACT_ICON,
		borderRadius: COMPACT_ICON / 2,
	},
	label: {
		...textStyles.subhead,
	},
	compactLabel: {
		...textStyles.footnote,
		fontWeight: "500",
	},
	labelFill: {
		flexShrink: 1,
	},
	labelHug: {
		flexShrink: 1,
	},
});
