import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";
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
 * design-system). Selected fills with the category's ink and gains a
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
		? "rgba(255,255,255,0.22)"
		: isAdd
			? colors.inner
			: isLocked
				? "transparent"
				: tint;
	const iconColor = isSelected ? colors.onAccent : isAdd ? colors.sub : ink;
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
				<SymbolView name="checkmark" size={12} tintColor={colors.onAccent} />
			) : null}
		</>
	);

	const chipStyle = [
		styles.chip,
		isCompact && styles.compactChip,
		{ backgroundColor: colors.card, borderColor: colors.border },
		isSelected && { backgroundColor: ink, borderColor: ink },
		isAdd && styles.add,
		isAdd && { backgroundColor: "transparent" },
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
	compactChip: {
		minHeight: 28,
		gap: 6,
		paddingLeft: 4,
		paddingRight: 10,
		paddingVertical: 2,
	},
	add: {
		borderStyle: "dashed",
	},
	hug: {
		alignSelf: "flex-start",
	},
	icon: {
		width: 24,
		height: 24,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	compactIcon: {
		width: 20,
		height: 20,
		borderRadius: 10,
	},
	label: {
		fontSize: 13.5,
		fontWeight: "500",
	},
	compactLabel: {
		fontSize: 13,
	},
	labelFill: {
		flex: 1,
	},
	labelHug: {
		flexShrink: 1,
	},
});
