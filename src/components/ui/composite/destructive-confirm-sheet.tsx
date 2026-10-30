import { type ReactNode, useEffect, useRef, useState } from "react";
import {
	type HostInstance,
	ScrollView,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import { Button } from "@/components/ui/primitives/button";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { log } from "@/lib/logger/logger";
import { showToast } from "@/store/toast-store";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { GENERIC_FAILURE_MESSAGE } from "@/utils/failure-message";
import { useAccessibilityTextSize } from "@/utils/use-accessibility-text-size";
import { useInitialFocus } from "@/utils/use-initial-focus";
import { Banner } from "./banner";
import { Container } from "./container";
import { ListItem } from "./list-item";
import { Sheet } from "./sheet";

/** How much of the screen the copy + preview may take before it scrolls. */
const SCROLL_MAX_SHARE = 0.5;

type DestructiveConfirmSheetProps = {
	visible: boolean;
	headline: string;
	body: string;
	/**
	 * The "with move preview" state (category delete, HAB-25): what the delete
	 * changes, between the copy and the buttons. Omit for the plain state.
	 */
	preview?: ReactNode;
	/**
	 * The reversible alternative (DC1 "Archive instead"): the first control and
	 * the one the screen reader starts on, ahead of the destructive one.
	 */
	safeAction?: { title: string; body: string; onPress: () => unknown };
	/** The destructive action's label ("Delete permanently"). */
	confirmLabel: string;
	/** Under the destructive button: "One tap deletes. This can't be undone." Read as its hint at accessibility sizes instead of shown (DC7). */
	confirmHint?: string;
	/** The label and hint while it runs (DC3): "Deleting…", "Keep the app open — this takes a moment." */
	busy?: { label: string; hint: string };
	/** The in-sheet banner after a failure (DC4); the destructive action stays available to try again. */
	error?: { title: string; message: string };
	/** The last control: it ends the sheet. There is no Close (V3-24). */
	cancelLabel: string;
	onCancel: () => void;
	onConfirm: () => unknown;
	/** While the action runs — every control goes inert and the sheet cannot be left (DC3). */
	isWorking?: boolean;
};

/**
 * V3-25 · destructive confirm: a title, the consequence, an optional preview,
 * then the safe way out first (Archive instead — the default focus), the
 * destructive action as an outlined red pill, and Cancel last. Never a Close,
 * never a filled red button. While the action runs (DC3) the label says so and
 * nothing can be pressed or swiped away; a failure (DC4) is a banner next to
 * the action that failed, with the action still there.
 *
 * Confirm and the safe action latch on the first tap until their handler
 * settles: `isWorking` only arrives after a re-render, so it alone can't stop a
 * second tap landing in the same frame.
 */
export function DestructiveConfirmSheet({
	visible,
	headline,
	body,
	preview,
	safeAction,
	confirmLabel,
	confirmHint,
	busy,
	error,
	cancelLabel,
	onCancel,
	onConfirm,
	isWorking = false,
}: DestructiveConfirmSheetProps) {
	const { colors } = useTheme();
	const { height } = useWindowDimensions();
	const largeText = useAccessibilityTextSize();
	const pendingRef = useRef(false);
	const safeRef = useRef<HostInstance>(null);
	const [isPending, setIsPending] = useState(false);
	const isInert = isWorking || isPending;

	useInitialFocus(safeRef, visible && safeAction !== undefined);

	useEffect(() => {
		if (!visible) {
			pendingRef.current = false;
			setIsPending(false);
		}
	}, [visible]);

	function once(handler: () => unknown) {
		return () => {
			if (pendingRef.current || isWorking) return;
			pendingRef.current = true;
			setIsPending(true);
			const release = () => {
				pendingRef.current = false;
				setIsPending(false);
			};
			let result: unknown;
			try {
				result = handler();
			} catch (error) {
				release();
				throw error;
			}
			// Callers pass handlers wrapped in `run()`, which toasts its own failure
			// and never rejects. A handler that rejects anyway still must not leave
			// the sheet locked or fail silently: let go so a retry works, log it,
			// and say something went wrong.
			Promise.resolve(result).then(release, (error) => {
				release();
				log.warn(
					"confirm-sheet",
					"a handler rejected — wrap it in run()",
					error,
				);
				showToast({ message: GENERIC_FAILURE_MESSAGE, tone: "error" });
			});
		};
	}

	const hint = isWorking && busy ? busy.hint : confirmHint;

	return (
		// Swipe down or a tap on the scrim is Cancel (DC1) — until the action runs.
		<Sheet visible={visible} onDismiss={onCancel} dismissible={!isInert}>
			<ScrollView
				testID="destructive-confirm-scroll"
				style={{ maxHeight: height * SCROLL_MAX_SHARE }}
				contentContainerStyle={styles.scrollContent}
			>
				<View style={styles.copy}>
					<Text
						accessibilityRole="header"
						style={[styles.headline, { color: colors.ink }]}
					>
						{headline}
					</Text>
					<Text style={[styles.body, { color: colors.sub }]}>{body}</Text>
				</View>
				{error ? (
					<Banner
						tone="error"
						symbol="exclamationmark.circle"
						title={error.title}
					>
						{error.message}
					</Banner>
				) : null}
				{preview}
				{safeAction ? (
					<Container variant="flat">
						<ListItem
							buttonRef={safeRef}
							title={safeAction.title}
							subtitle={safeAction.body}
							leading={<IconBadge symbol="archivebox" />}
							navigable
							accessibilityLabel={`${safeAction.title}. ${safeAction.body}`}
							onPress={once(safeAction.onPress)}
							dimmed={isInert}
						/>
					</Container>
				) : null}
			</ScrollView>
			<View style={styles.actions}>
				<Button
					label={isWorking && busy ? busy.label : confirmLabel}
					variant="destructive"
					onPress={once(onConfirm)}
					disabled={isInert}
				/>
				{hint && !largeText ? (
					<Text
						accessibilityLiveRegion="polite"
						style={[styles.hint, { color: colors.sub }]}
					>
						{hint}
					</Text>
				) : null}
				{hint && largeText ? (
					// Not drawn at large sizes (DC7); VoiceOver reads it instead.
					<Text
						accessibilityLiveRegion="polite"
						style={styles.hiddenHint}
						importantForAccessibility="yes"
					>
						{hint}
					</Text>
				) : null}
			</View>
			<Button
				label={cancelLabel}
				variant="secondary"
				onPress={onCancel}
				disabled={isInert}
			/>
		</Sheet>
	);
}

const styles = StyleSheet.create({
	scrollContent: {
		gap: space[400],
	},
	copy: {
		gap: space[200],
		paddingHorizontal: space[100],
	},
	headline: {
		...textStyles.title,
	},
	body: {
		...textStyles.footnote,
	},
	actions: {
		gap: space[200],
	},
	hint: {
		...textStyles.footnote,
		paddingHorizontal: space[100],
	},
	hiddenHint: {
		height: 0,
		overflow: "hidden",
	},
});
