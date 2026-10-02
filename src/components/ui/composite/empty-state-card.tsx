import { SymbolView } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/primitives/button";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { Container } from "./container";

type EmptyStateCardProps = {
	title: string;
	message: string;
	actionLabel: string;
	onAction: () => void;
};

/**
 * A card standing in for a whole list that has nothing to show — a dashed
 * badge, a title, why, and the one action that fills it (Manage's "No active
 * habits", HAB-19). A list's empty *section* uses `PlaceholderCard` instead.
 */
export function EmptyStateCard({
	title,
	message,
	actionLabel,
	onAction,
}: EmptyStateCardProps) {
	const { colors } = useTheme();

	return (
		<Container>
			<View style={styles.body}>
				<View style={[styles.badge, { backgroundColor: colors.inner }]}>
					<SymbolView name="circle.dashed" size={22} tintColor={colors.faint} />
				</View>
				<Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
				<Text style={[styles.message, { color: colors.sub }]}>{message}</Text>
				<Button label={actionLabel} fullWidth={false} onPress={onAction} />
			</View>
		</Container>
	);
}

const styles = StyleSheet.create({
	body: {
		alignItems: "center",
		gap: 8,
		paddingVertical: 4,
	},
	badge: {
		width: 44,
		height: 44,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 4,
	},
	title: {
		fontSize: typeScale.rowLabel,
		fontWeight: "600",
	},
	message: {
		fontSize: typeScale.subtitle,
		textAlign: "center",
		marginBottom: 8,
	},
});
