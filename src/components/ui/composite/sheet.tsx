import type { PropsWithChildren } from "react";
import {
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/theme/use-theme";
import { Container } from "./container";

type SheetProps = PropsWithChildren<{
	visible: boolean;
	/** Called on scrim tap and on the Android back gesture/button. */
	onDismiss: () => void;
	/**
	 * When false, tapping the scrim does nothing and the sheet can only be left
	 * through one of its own actions — for decisions that must be made
	 * explicitly (e.g. Streak at risk, Delete confirmation).
	 */
	dismissible?: boolean;
}>;

/**
 * Bottom sheet over a dimmed background: the Modal + scrim + sheet chrome that
 * every sheet shares (category picker, Quantity log, Streak at risk, Retro
 * log, Delete confirmation). Callers pass only the sheet's content.
 */
export function Sheet({
	visible,
	onDismiss,
	dismissible = true,
	children,
}: SheetProps) {
	const { colors } = useTheme();

	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={dismissible ? onDismiss : undefined}
		>
			{/* Keeps a sheet's text field (Retro log's note) above the keyboard. */}
			<KeyboardAvoidingView
				style={styles.root}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				<Pressable
					style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
					onPress={dismissible ? onDismiss : undefined}
					disabled={!dismissible}
					accessibilityRole="button"
					accessibilityLabel="Dismiss"
				/>
				<Container variant="sheet">
					<SafeAreaView edges={["bottom"]} style={styles.content}>
						{children}
					</SafeAreaView>
				</Container>
			</KeyboardAvoidingView>
		</Modal>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		justifyContent: "flex-end",
	},
	content: {
		gap: 16,
	},
});
