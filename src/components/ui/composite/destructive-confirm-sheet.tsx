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
import { useHaptics } from "@/utils/use-haptics";
import { useInitialFocus } from "@/utils/use-initial-focus";
import { Banner } from "./banner";
import { Container } from "./container";
import { ListItem } from "./list-item";
import { Sheet } from "./sheet";

const SCROLL_MAX_SHARE = 0.5;

type DestructiveConfirmSheetProps = {
	visible: boolean;
	headline: string;
	body: string;
	preview?: ReactNode;
	safeAction?: { title: string; body: string; onPress: () => unknown };
	confirmLabel: string;
	confirmHint?: string;
	busy?: { label: string; hint: string };
	error?: { title: string; message: string };
	cancelLabel: string;
	onCancel: () => void;
	onConfirm: () => unknown;
	isWorking?: boolean;
};

// Confirm and the safe action latch on the first tap until their handler settles: `isWorking`
// only arrives after a re-render, so it alone can't stop a second tap in the same frame.
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
	const haptics = useHaptics();
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
			// `run()` handlers never reject; one that does anyway must not leave the sheet locked or fail silently.
			Promise.resolve(result).then(release, (error) => {
				release();
				log.warn("confirm_sheet.handler_rejected", { error });
				showToast({ message: GENERIC_FAILURE_MESSAGE, tone: "error" });
			});
		};
	}

	const hint = isWorking && busy ? busy.hint : confirmHint;

	return (
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
					onPress={once(() => {
						haptics.warning();
						return onConfirm();
					})}
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
