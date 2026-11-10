import {
	type PropsWithChildren,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
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
import { motion, space } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useReducedMotion } from "@/utils/use-reduced-motion";
import { Container } from "./container";
import { ToastHost } from "./toast-host";

type SheetProps = PropsWithChildren<{
	visible: boolean;
	onDismiss: () => void;
	/**
	 * When false, tapping the scrim does nothing and the sheet can only be left
	 * through one of its own actions — for decisions that must be made
	 * explicitly (e.g. Streak at risk, Delete confirmation).
	 */
	dismissible?: boolean;
	/**
	 * Where a toast raised while the sheet is open shows. "top" (default) is the Modal's own host;
	 * "inline" leaves it to the caller, who puts a `<ToastHost placement="inline" />` above the sheet's
	 * last button.
	 */
	toast?: "top" | "inline";
}>;

/** The Modal + scrim + sheet chrome that every sheet shares. Callers pass only the sheet's content. */
export function Sheet({
	visible,
	onDismiss,
	dismissible = true,
	toast = "top",
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

	// Closing is the Modal's own slide-out. Until it has finished the sheet keeps
	// the content it last showed: a caller that blanks its content the moment it
	// closes (`draft !== null`, `usage !== null`) must not shrink the sheet
	// mid-slide, and nothing is torn out of the screen half-way.
	const lastChildren = useRef<ReactNode>(children);
	if (visible) lastChildren.current = children;
	const [mounted, setMounted] = useState(visible);
	useEffect(() => {
		if (visible) {
			setMounted(true);
			return;
		}
		const timer = setTimeout(() => setMounted(false), motion.sheet.duration);
		return () => clearTimeout(timer);
	}, [visible]);
	if (!visible && !mounted) return null;

	return (
		<Modal
			visible={visible}
			transparent
			testID="sheet-modal"
			animationType={reducedMotion ? "fade" : "slide"}
			onRequestClose={dismissible ? onDismiss : undefined}
		>
			<KeyboardAvoidingView
				// iOS: VoiceOver stays inside the sheet while it is open.
				accessibilityViewIsModal
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
							{visible ? children : lastChildren.current}
						</ScrollView>
					</SafeAreaView>
				</Container>
				{visible && toast === "top" ? <ToastHost placement="top" /> : null}
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
		gap: space[400],
	},
});
