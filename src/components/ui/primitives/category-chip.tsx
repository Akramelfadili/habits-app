import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";
import { useTheme } from "@/theme/use-theme";

/**
 * NEW-28 states (design-system-v2.md). `locked` (Manage Categories' built-ins)
 * arrives with HAB-25.
 */
export type CategoryChipState = "unselected" | "selected" | "add" | "preview";

type CategoryChipProps = {
	label: string;
	state: CategoryChipState;
	/** The category's own icon + colors; the add chip ignores both. */
	symbol?: SFSymbol;
	accent?: { tint: string; ink: string };
	onPress?: () => void;
};

/**
 * Category chip — icon + label in the category's *own* color, unlike `Chip`,
 * which fills with the app accent (kept separate on purpose, per
 * design-system-v2). Selected fills with the category's ink and gains a
 * check; long labels truncate rather than wrap, so a 2-up grid stays aligned.
 */
export function CategoryChip({
	label,
	state,
	symbol,
	accent,
	onPress,
}: CategoryChipProps) {
	const { colors, opacity } = useTheme();
	const isSelected = state === "selected";
	const isAdd = state === "add";
	const ink = accent?.ink ?? colors.sub;
	const tint = accent?.tint ?? colors.inner;

	const iconBackground = isSelected
		? "rgba(255,255,255,0.22)"
		: isAdd
			? colors.inner
			: tint;
	const iconColor = isSelected ? colors.onAccent : isAdd ? colors.sub : ink;
	const labelColor = isSelected
		? colors.onAccent
		: isAdd
			? colors.sub
			: colors.ink;

	const content = (
		<>
			<View style={[styles.icon, { backgroundColor: iconBackground }]}>
				<SymbolView
					name={isAdd ? "plus" : (symbol ?? "circle")}
					size={11}
					tintColor={iconColor}
				/>
			</View>
			<Text
				numberOfLines={1}
				ellipsizeMode="tail"
				style={[
					styles.label,
					// A preview hugs its text; grid chips stretch the label so the
					// selected check sits at the far edge.
					state === "preview" ? styles.labelHug : styles.labelFill,
					{ color: labelColor },
				]}
			>
				{label}
			</Text>
			{isSelected ? (
				<SymbolView name="checkmark" size={12} tintColor={colors.onAccent} />
			) : null}
		</>
	);

	const chipStyle = [
		styles.chip,
		{ backgroundColor: colors.card, borderColor: colors.border },
		isSelected && { backgroundColor: ink, borderColor: ink },
		isAdd && styles.add,
		isAdd && { backgroundColor: "transparent" },
	];

	if (state === "preview") {
		return (
			<View testID="category-chip" style={[chipStyle, styles.preview]}>
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
				chipStyle,
				pressed && { opacity: opacity.pressed },
			]}
		>
			{content}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	chip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		minHeight: 36,
		borderRadius: 999,
		borderWidth: 1,
		paddingLeft: 6,
		paddingRight: 12,
		paddingVertical: 5,
	},
	add: {
		borderStyle: "dashed",
	},
	preview: {
		alignSelf: "flex-start",
	},
	icon: {
		width: 24,
		height: 24,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	label: {
		fontSize: 13.5,
		fontWeight: "500",
	},
	labelFill: {
		flex: 1,
	},
	labelHug: {
		flexShrink: 1,
	},
});
