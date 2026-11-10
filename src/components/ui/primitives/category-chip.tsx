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

/**
 * NEW-28 states (design-system.md). `locked` is Manage Categories'
 * built-ins (HAB-25): tinted with the category's own color, never interactive.
 */
export type CategoryChipState =
	| "unselected"
	| "selected"
	| "add"
	| "preview"
	| "locked";

type CategoryChipProps = {
	label: string;
	state: CategoryChipState;
	/** The category's own icon + colors; the add chip ignores both. */
	symbol?: SFSymbol;
	accent?: { tint: string; ink: string };
	/**
	 * Omit for a chip that only labels something (Manage Categories' custom
	 * rows): it then hugs its text and isn't announced as a button. `preview`
	 * and `locked` ignore it — they're never interactive.
	 */
	onPress?: () => void;
	/** "compact" is a list row's chip (Manage Categories, HAB-25) — smaller than the picker grid's. */
	size?: "default" | "compact";
};

/**
 * Category chip — icon + label in the category's *own* color, unlike `Chip`,
 * which fills with the app accent (kept separate on purpose, per
 * design-system). Selected fills with the accent (V3-14) and gains a
 * check; long labels truncate rather than wrap, so a 2-up grid stays aligned.
 * Locked fills with the category's tint instead of an outline.
 */
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
					// A static chip hugs its text; grid chips stretch the label so
					// the selected check sits at the far edge.
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
		// V3-14: selected is the one accent, not the category's own colour.
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
	// An interactive chip's touch area is 44pt tall around the 36pt pill.
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
