import { Children, type PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { radius, space } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type ContainerProps = PropsWithChildren<{
	/**
	 * "outlined" is a card with a hairline border, for a card sitting on a
	 * card-coloured surface (the category move preview inside a sheet, HAB-25).
	 * "flat" is V3's list card (T-18): no padding, a hairline
	 * border, radius `l`, and a full-bleed hairline between its children — the
	 * rows carry their own padding. "summary" is V3's compact info card (Habit
	 * Detail's history, D1): radius `l`, a hairline border, 14 pt padding and an
	 * 8 pt gap between its parts.
	 */
	variant?: "card" | "inset" | "sheet" | "outlined" | "flat" | "summary";
	/**
	 * Groups direct children into one card, separating them with a full-bleed
	 * hairline instead of the card's default gap (e.g. Category + Direction
	 * on the habit form). Each child is its own section — group multiple
	 * elements under one wrapper View to keep them in the same section.
	 */
	dividers?: boolean;
	/**
	 * Tighter spacing around each divider — for a list of short, uniform rows
	 * (Habit Detail's recent entries) rather than form sections. Only applies
	 * with `dividers`.
	 */
	compact?: boolean;
	/**
	 * A list card whose rows carry their own padding (compact `ListItem`s on
	 * Manage & Archive, HAB-13) — a thin inset so a lifted row's highlight
	 * sits just inside the card edge.
	 */
	tight?: boolean;
	/**
	 * A list card with a row held mid-drag, the layout unchanged. A tight card
	 * takes an ink outline; a flat one (V3's library, H4) lets the lifted row's
	 * shadow out instead of clipping it.
	 */
	lifted?: boolean;
}>;

export function Container({
	variant = "card",
	dividers = false,
	compact = false,
	tight = false,
	lifted = false,
	children,
}: ContainerProps) {
	const { colors } = useTheme();
	const flat = variant === "flat";
	const sections = dividers || flat ? Children.toArray(children) : null;

	return (
		<View
			style={[
				styles.base,
				variant === "sheet" && styles.sheet,
				variant === "summary" && styles.summary,
				(dividers || flat) && styles.dividedBase,
				flat && styles.flat,
				flat && lifted && styles.flatLifted,
				tight && styles.tight,
				tight && (variant === "outlined" || lifted) && styles.tightOutlined,
				{
					backgroundColor: variant === "inset" ? colors.inner : colors.card,
					borderWidth:
						variant === "summary"
							? StyleSheet.hairlineWidth
							: variant === "outlined" || variant === "flat" || lifted
								? 1
								: 0,
					borderColor:
						lifted && !flat
							? colors.ink
							: variant === "outlined" ||
									variant === "flat" ||
									variant === "summary"
								? colors.border
								: "transparent",
				},
			]}
		>
			{variant === "sheet" ? (
				<View style={[styles.grabber, { backgroundColor: colors.border }]} />
			) : null}
			{sections
				? sections.map((section, index) => (
						<View
							// biome-ignore lint/suspicious/noArrayIndexKey: sections are a stable, order-only list of the caller's own child elements
							key={index}
							testID="container-section"
							style={
								flat || compact ? styles.compactSection : styles.dividedSection
							}
						>
							{index > 0 ? (
								<View
									style={[
										styles.divider,
										compact && styles.compactDivider,
										flat && styles.flatDivider,
										{ backgroundColor: colors.border },
									]}
								/>
							) : null}
							{section}
						</View>
					))
				: children}
		</View>
	);
}

const styles = StyleSheet.create({
	base: {
		borderRadius: 16,
		padding: space[400],
		gap: space[400],
	},
	dividedBase: {
		gap: 0,
	},
	summary: {
		borderRadius: radius.l,
		padding: space[350],
		gap: space[200],
	},
	flat: {
		padding: 0,
		borderRadius: radius.l,
		overflow: "hidden",
	},
	flatLifted: {
		overflow: "visible",
		zIndex: 1,
	},
	flatDivider: {
		marginVertical: 0,
	},
	tight: {
		padding: space[150],
		gap: 0,
	},
	// The 1px outline replaces 1px of padding, so lifting a card doesn't shift its rows.
	tightOutlined: {
		padding: 5,
	},
	dividedSection: {
		gap: space[400],
	},
	compactSection: {
		gap: 0,
	},
	divider: {
		height: StyleSheet.hairlineWidth,
		marginVertical: space[300],
	},
	compactDivider: {
		marginVertical: space[250],
	},
	sheet: {
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		borderBottomLeftRadius: 0,
		borderBottomRightRadius: 0,
		paddingTop: space[250],
		// Lets a sheet's scrolling content shrink above the keyboard.
		flexShrink: 1,
	},
	grabber: {
		width: 36,
		height: 4,
		borderRadius: 2,
		alignSelf: "center",
	},
});
