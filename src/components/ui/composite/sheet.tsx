import { type PropsWithChildren, useEffect } from "react";
import {
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useToastStore } from "@/store/toast-store";
import { useTheme } from "@/theme/use-theme";
import { useReducedMotion } from "@/utils/use-reduced-motion";
import { Container } from "./container";
import { ToastHost } from "./toast-host";

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
	const registerSheet = useToastStore((state) => state.registerSheet);
	const reducedMotion = useReducedMotion();

	// A native Modal covers the page, so while one is open the page-level toast
	// host steps aside and the one inside this Modal (below) shows the toast.
	useEffect(
		() => (visible ? registerSheet() : undefined),
		[visible, registerSheet],
	);

	return (
		<Modal
			visible={visible}
			transparent
			testID="sheet-modal"
			animationType={reducedMotion ? "fade" : "slide"}
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
					<SafeAreaView edges={["bottom"]} style={styles.safe}>
						{/* Large text or a small phone can outgrow the sheet: it scrolls
						    instead of clipping, and shrinks above the keyboard. */}
						<ScrollView
							bounces={false}
							keyboardShouldPersistTaps="handled"
							showsVerticalScrollIndicator={false}
							style={styles.scroll}
							contentContainerStyle={styles.content}
						>
							{children}
						</ScrollView>
					</SafeAreaView>
				</Container>
				{visible ? <ToastHost placement="top" /> : null}
			</KeyboardAvoidingView>
		</Modal>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		justifyContent: "flex-end",
	},
	safe: {
		flexShrink: 1,
	},
	scroll: {
		flexGrow: 0,
	},
	content: {
		gap: 16,
	},
});
