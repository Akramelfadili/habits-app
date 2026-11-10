import { Children, type PropsWithChildren } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { radius, space } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type ContainerProps = PropsWithChildren<{
	variant?: "card" | "inset" | "sheet" | "outlined" | "flat" | "summary";
	// Each direct child is its own section; wrap several elements in one View to keep them together.
	dividers?: boolean;
	compact?: boolean;
	tight?: boolean;
	// A flat card lets the lifted row's shadow out instead of clipping it.
	lifted?: boolean;
	padding?: "default" | "snug";
}> &
	Pick<ViewProps, "testID" | "accessible" | "accessibilityLabel">;

export function Container({
	variant = "card",
	dividers = false,
	compact = false,
	tight = false,
	lifted = false,
	padding = "default",
	testID,
	accessible,
	accessibilityLabel,
	children,
}: ContainerProps) {
	const { colors } = useTheme();
	const flat = variant === "flat";
	const sections = dividers || flat ? Children.toArray(children) : null;

	return (
		<View
			testID={testID}
			accessible={accessible}
			accessibilityLabel={accessibilityLabel}
			style={[
				styles.base,
				padding === "snug" && styles.snug,
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
		borderRadius: radius.l,
		padding: space[400],
		gap: space[400],
	},
	snug: {
		padding: space[350],
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
		borderTopLeftRadius: radius.xl,
		borderTopRightRadius: radius.xl,
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
