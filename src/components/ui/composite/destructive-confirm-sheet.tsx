import type { ReactNode } from "react";
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
	keepLabel: string;
	/** Repeats the consequence when there is one ("Delete and move 3 habits"). */
	confirmLabel: string;
	onKeep: () => void;
	onConfirm: () => void;
	/** While the delete runs — both buttons go inert so it can't fire twice. */
	isWorking?: boolean;
};

/**
 * NEW-33 Destructive confirm sheet (design-system-v2.md): warning icon,
 * headline, consequence, an optional preview, then a primary "keep" and the
 * delete demoted to a small red text link — the safe option dominant, the
 * permanent one smallest. Non-dismissible: leaving means picking one.
 * The copy and preview scroll when they outgrow half the screen, so a long
 * list is never cut off. HAB-23 moves `DeleteHabitSheet` onto this (its
 * "with archive action" state).
 */
export function DestructiveConfirmSheet({
	visible,
	headline,
	body,
	preview,
	keepLabel,
	confirmLabel,
	onKeep,
	onConfirm,
	isWorking = false,
}: DestructiveConfirmSheetProps) {
	const { colors } = useTheme();
	const { height } = useWindowDimensions();

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
			</ScrollView>
			<Button label={keepLabel} onPress={onKeep} disabled={isWorking} />
			<Button
				label={confirmLabel}
				variant="destructive"
				onPress={onConfirm}
				disabled={isWorking}
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
