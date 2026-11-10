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
	dismissible?: boolean;
	toast?: "top" | "inline";
}>;

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

	useEffect(
		() => (visible ? registerSheet() : undefined),
		[visible, registerSheet],
	);

	// Until the Modal's slide-out finishes the sheet keeps the content it last showed, so a caller
	// that blanks its content on close doesn't shrink the sheet mid-slide.
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
