import { useRef } from "react";
import { type HostInstance, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/primitives/button";
import { space, typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useInitialFocus } from "@/utils/use-initial-focus";

type SheetHeaderProps = {
	title: string;
	/** Trailing text action, e.g. "Close". */
	actionLabel: string;
	onAction: () => void;
};

/**
 * A bottom sheet's title row: title left, a small text action right — Retro
 * log's "Tuesday, 8 September … Close" (HAB-10). A screen reader starts on the
 * title when the sheet opens (08.4: "Sheet — default focus: Title").
 */
export function SheetHeader({
	title,
	actionLabel,
	onAction,
}: SheetHeaderProps) {
	const { colors } = useTheme();
	const titleRef = useRef<HostInstance>(null);
	useInitialFocus(titleRef, true);

	return (
		<View style={styles.row}>
			<Text
				ref={titleRef}
				accessible
				accessibilityRole="header"
				style={[styles.title, { color: colors.ink }]}
			>
				{title}
			</Text>
			<Button
				label={actionLabel}
				variant="link"
				fullWidth={false}
				onPress={onAction}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: space[300],
		paddingHorizontal: space[100],
	},
	title: {
		flex: 1,
		fontSize: typeScale.section,
		fontWeight: "500",
	},
});
