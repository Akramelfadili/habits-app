import { useRef } from "react";
import {
	type HostInstance,
	Modal,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useInitialFocus } from "@/utils/use-initial-focus";

export type AlertAction = {
	label: string;
	onPress: () => void;
	/** "primary" is the safe choice: bold, and where VoiceOver starts. "destructive" is the red one. */
	tone: "primary" | "destructive";
};

type AlertDialogProps = {
	visible: boolean;
	title: string;
	message: string;
	/** Stacked top to bottom; the primary one first (F9: Keep editing, then Discard). */
	actions: AlertAction[];
	/** Android back / the system dismiss gesture: it chooses the safe action. */
	onRequestClose: () => void;
};

/** The dialog is 270 pt wide, like the system alert it follows (F9). */
const WIDTH = 270;

/**
 * V3 alert (F9): a centred card over the scrim with a title, one line of
 * explanation and stacked text actions under hairlines — Keep editing bold,
 * Discard in danger red. It is drawn here, not with the system alert, so it
 * looks and behaves the same on web and in the flows. Focus starts on the
 * primary action, and a scrim tap does nothing: a decision has to be made.
 */
export function AlertDialog({
	visible,
	title,
	message,
	actions,
	onRequestClose,
}: AlertDialogProps) {
	const { colors } = useTheme();
	const primaryRef = useRef<HostInstance>(null);
	useInitialFocus(primaryRef, visible);

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onRequestClose}
			testID="alert-dialog"
		>
			<View style={[styles.scrim, { backgroundColor: colors.scrim }]}>
				<View
					accessibilityViewIsModal
					accessibilityRole="alert"
					style={[
						styles.card,
						{ backgroundColor: colors.card, borderColor: colors.border },
					]}
				>
					<View
						style={styles.text}
						accessible
						accessibilityLabel={`${title}. ${message}`}
					>
						<Text
							accessibilityRole="header"
							style={[styles.title, { color: colors.ink }]}
						>
							{title}
						</Text>
						<Text style={[styles.message, { color: colors.sub }]}>
							{message}
						</Text>
					</View>
					{actions.map((action) => (
						<Pressable
							key={action.label}
							ref={action.tone === "primary" ? primaryRef : undefined}
							accessibilityRole="button"
							onPress={action.onPress}
							style={({ pressed }) => [
								styles.action,
								{ borderTopColor: colors.border },
								pressed && { backgroundColor: colors.inner },
							]}
						>
							<Text
								style={[
									styles.actionLabel,
									action.tone === "primary" && styles.primaryLabel,
									{
										color:
											action.tone === "destructive"
												? colors.dangerBg
												: colors.ink,
									},
								]}
							>
								{action.label}
							</Text>
						</Pressable>
					))}
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	scrim: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	card: {
		width: WIDTH,
		borderRadius: radius.l,
		borderWidth: StyleSheet.hairlineWidth,
		overflow: "hidden",
	},
	text: {
		gap: space[50],
		paddingHorizontal: space[400],
		paddingVertical: space[500],
		alignItems: "center",
	},
	title: {
		...textStyles.bodyLg,
		fontWeight: "600",
		textAlign: "center",
	},
	message: {
		...textStyles.footnote,
		textAlign: "center",
	},
	action: {
		minHeight: 44,
		alignItems: "center",
		justifyContent: "center",
		borderTopWidth: StyleSheet.hairlineWidth,
		paddingHorizontal: space[400],
	},
	actionLabel: {
		...textStyles.bodyLg,
		fontWeight: "500",
	},
	primaryLabel: {
		fontWeight: "600",
	},
});
