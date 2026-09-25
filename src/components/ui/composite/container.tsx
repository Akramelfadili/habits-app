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
}>;

export function Container({
	variant = "card",
	dividers = false,
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
				{
					backgroundColor: variant === "inset" ? colors.inner : colors.card,
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
							style={styles.dividedSection}
						>
							{index > 0 ? (
								<View
									style={[styles.divider, { backgroundColor: colors.border }]}
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
	dividedSection: {
		gap: 16,
	},
	divider: {
		height: StyleSheet.hairlineWidth,
		marginVertical: 12,
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
