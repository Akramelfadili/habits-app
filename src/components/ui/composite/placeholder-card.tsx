import { StyleSheet, Text } from "react-native";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { Container } from "./container";

type PlaceholderCardProps = {
	title: string;
	message: string;
};

/**
 * Dashed outline marking where something will appear once it exists — keeps
 * a section's header in place and says how to fill it (Manage's "Nothing
 * archived", HAB-19). Not interactive.
 */
export function PlaceholderCard({ title, message }: PlaceholderCardProps) {
	const { colors } = useTheme();

	return (
		<Container variant="dashed">
			<Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
			<Text style={[styles.message, { color: colors.sub }]}>{message}</Text>
		</Container>
	);
}

const styles = StyleSheet.create({
	title: {
		fontSize: typeScale.rowLabel,
		fontWeight: "600",
	},
	message: {
		fontSize: typeScale.subtitle,
		marginTop: -8,
	},
});
