import { Children, type PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/use-theme";

type ContainerProps = PropsWithChildren<{
	variant?: "card" | "inset" | "sheet";
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
}>;

export function Container({
	variant = "card",
	dividers = false,
	compact = false,
	selected = false,
	tight = false,
	children,
}: ContainerProps) {
	const { colors } = useTheme();
	const sections = dividers ? Children.toArray(children) : null;

	return (
		<View
			style={[
				styles.base,
				variant === "sheet" && styles.sheet,
				dividers && styles.dividedBase,
				tight && styles.tight,
				{
					backgroundColor: variant === "inset" ? colors.inner : colors.card,
					borderWidth: selected ? 1.5 : 0,
					borderColor: selected ? colors.ink : "transparent",
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
							style={compact ? styles.compactSection : styles.dividedSection}
						>
							{index > 0 ? (
								<View
									style={[
										styles.divider,
										compact && styles.compactDivider,
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
	tight: {
		padding: 6,
		gap: 0,
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
	},
	grabber: {
		width: 36,
		height: 4,
		borderRadius: 2,
		alignSelf: "center",
	},
});
