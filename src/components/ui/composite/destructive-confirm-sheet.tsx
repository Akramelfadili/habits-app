import { type ReactNode, useEffect, useRef, useState } from "react";
import {
	ScrollView,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import { Button } from "@/components/ui/primitives/button";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { ActionCard } from "./action-card";
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
	 * The "with archive action" state (habit delete, HAB-23 E7): a NEW-25
	 * card offering the reversible alternative, between the copy and Keep.
	 */
	action?: { title: string; body: string; onPress: () => unknown };
	keepLabel: string;
	/** Repeats the consequence when there is one ("Delete and move 3 habits"). */
	confirmLabel: string;
	onKeep: () => void;
	onConfirm: () => unknown;
	/** While the delete runs — every control goes inert so it can't fire twice. */
	isWorking?: boolean;
};

/**
 * NEW-33 Destructive confirm sheet (design-system.md): warning icon,
 * headline, consequence, an optional preview or archive action, then a
 * primary "keep" and the delete demoted to a small red text link — the safe
 * option dominant, the permanent one smallest. Non-dismissible: leaving means
 * picking one. The copy and preview scroll when they outgrow half the
 * screen, so a long list is never cut off.
 *
 * Confirm and the action latch on the first tap until their handler settles:
 * `isWorking` only arrives after a re-render, so it alone can't stop a second
 * tap landing in the same frame.
 */
export function DestructiveConfirmSheet({
	visible,
	headline,
	body,
	preview,
	action,
	keepLabel,
	confirmLabel,
	onKeep,
	onConfirm,
	isWorking = false,
}: DestructiveConfirmSheetProps) {
	const { colors } = useTheme();
	const { height } = useWindowDimensions();
	const pendingRef = useRef(false);
	const [isPending, setIsPending] = useState(false);
	const isInert = isWorking || isPending;

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
			// Failures are the caller's to surface (Detail toasts them, HAB-23);
			// the latch only has to let go so the action can be retried.
			Promise.resolve(result).then(release, release);
		};
	}

	return (
		<Sheet visible={visible} onDismiss={onKeep} dismissible={false}>
			<ScrollView
				testID="destructive-confirm-scroll"
				style={{ maxHeight: height * SCROLL_MAX_SHARE }}
				contentContainerStyle={styles.scrollContent}
			>
				<View style={styles.copy}>
					<IconBadge
						size="large"
						symbol="exclamationmark"
						accent={{ tint: colors.warnTint, ink: colors.warnInk }}
					/>
					<Text
						accessibilityRole="header"
						style={[styles.headline, { color: colors.ink }]}
					>
						{headline}
					</Text>
					<Text style={[styles.body, { color: colors.sub }]}>{body}</Text>
				</View>
				{preview}
				{action ? (
					<ActionCard
						title={action.title}
						subtitle={action.body}
						symbol="archivebox"
						onPress={once(action.onPress)}
						disabled={isInert}
					/>
				) : null}
			</ScrollView>
			<Button label={keepLabel} onPress={onKeep} disabled={isInert} />
			<Button
				label={confirmLabel}
				variant="destructive"
				onPress={once(onConfirm)}
				disabled={isInert}
			/>
		</Sheet>
	);
}

const styles = StyleSheet.create({
	scrollContent: {
		gap: 16,
	},
	copy: {
		gap: 8,
		paddingHorizontal: 4,
	},
	headline: {
		fontSize: typeScale.section,
		fontWeight: "600",
		marginTop: 4,
	},
	body: {
		fontSize: typeScale.subtitle,
		lineHeight: 18,
	},
});
