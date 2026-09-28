import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/primitives/button";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type SheetHeaderProps = {
	title: string;
	/** Trailing text action, e.g. "Close". */
	actionLabel: string;
	onAction: () => void;
};

/**
 * A bottom sheet's title row: title left, a small text action right — Retro
 * log's "Tuesday, 8 September … Close" (HAB-10).
 */
export function SheetHeader({
	title,
	actionLabel,
	onAction,
}: SheetHeaderProps) {
	const { colors } = useTheme();

	return (
		<View style={styles.row}>
			<Text
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
		gap: 12,
		paddingHorizontal: 4,
	},
	title: {
		flex: 1,
		fontSize: typeScale.section,
		fontWeight: "500",
	},
});
