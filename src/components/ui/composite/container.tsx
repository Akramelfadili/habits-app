import { Children, type PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { radius } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type ContainerProps = PropsWithChildren<{
	/**
	 * "outlined" is a card with a hairline border, for a card sitting on a
	 * card-coloured surface (the category move preview inside a sheet, HAB-25).
	 * "dashed" is a transparent placeholder outline (Manage's empty Archived
	 * section, HAB-19). "flat" is V3's list card (T-18): no padding, a hairline
	 * border, radius `l`, and a full-bleed hairline between its children — the
	 * rows carry their own padding.
	 */
	variant?: "card" | "inset" | "sheet" | "outlined" | "dashed" | "flat";
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
	/** Ink border ring — a selectable card that's currently picked (First Run, HAB-06). */
	selected?: boolean;
	/**
	 * A list card whose rows carry their own padding (compact `ListItem`s on
	 * Manage & Archive, HAB-13) — a thin inset so a lifted row's highlight
	 * sits just inside the card edge.
	 */
	tight?: boolean;
	/**
	 * A list card with a row held mid-drag: ink outline on the card, the
	 * layout unchanged (Manage's scoped reorder, HAB-19).
	 */
	lifted?: boolean;
}>;

export function Container({
	variant = "card",
	dividers = false,
	compact = false,
	selected = false,
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
				(dividers || flat) && styles.dividedBase,
				flat && styles.flat,
				tight && styles.tight,
				tight && (variant === "outlined" || lifted) && styles.tightOutlined,
				variant === "dashed" && styles.dashed,
				{
					backgroundColor:
						variant === "inset"
							? colors.inner
							: variant === "dashed"
								? "transparent"
								: colors.card,
					borderWidth: selected
						? 1.5
						: variant === "outlined" ||
								variant === "dashed" ||
								variant === "flat" ||
								lifted
							? 1
							: 0,
					borderColor: selected
						? colors.ink
						: lifted
							? colors.ink
							: variant === "outlined" ||
									variant === "dashed" ||
									variant === "flat"
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
		padding: 16,
		gap: 16,
	},
	dividedBase: {
		gap: 0,
	},
	flat: {
		padding: 0,
		borderRadius: radius.l,
		overflow: "hidden",
	},
	flatDivider: {
		marginVertical: 0,
	},
	tight: {
		padding: 6,
		gap: 0,
	},
	// The 1px outline replaces 1px of padding, so lifting a card doesn't shift its rows.
	tightOutlined: {
		padding: 5,
	},
	dashed: {
		borderStyle: "dashed",
	},
	dividedSection: {
		gap: 16,
	},
	compactSection: {
		gap: 0,
	},
	divider: {
		height: StyleSheet.hairlineWidth,
		marginVertical: 12,
	},
	compactDivider: {
		marginVertical: 10,
	},
	sheet: {
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		borderBottomLeftRadius: 0,
		borderBottomRightRadius: 0,
		paddingTop: 10,
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
