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
import { useAccessibilityTextSize } from "@/utils/use-accessibility-text-size";
import { useHaptics } from "@/utils/use-haptics";
import { useInitialFocus } from "@/utils/use-initial-focus";
import { Button } from "../primitives/button";

type AlertAction = {
	label: string;
	onPress: () => void;
	/** "primary" is the safe choice: bold, and where VoiceOver starts. "destructive" is the red one. */
	tone: "primary" | "destructive";
};

type AlertDialogProps = {
	visible: boolean;
	title: string;
	message: string;
	/** Stacked top to bottom; the primary one first. */
	actions: AlertAction[];
	/** Android back / the system dismiss gesture: it chooses the safe action. */
	onRequestClose: () => void;
	/**
	 * "list" (default): text actions under hairlines. "offer": the first action is a full-width
	 * primary button, the rest are quiet links under it: a question with a yes to lean towards.
	 */
	layout?: "list" | "offer";
};

/** 270 pt wide, like the system alert it follows. */
const WIDTH = 270;

/**
 * A centred card over the scrim: title, one line of explanation, stacked text actions under hairlines.
 * Drawn here, not with the system alert, so it looks and behaves the same on web and in the flows.
 * Focus starts on the primary action; a scrim tap does nothing, a decision has to be made.
 * At accessibility sizes the card takes the screen width less 16 pt insets so buttons can stack and wrap.
 */
export function AlertDialog({
	visible,
	title,
	message,
	actions,
	onRequestClose,
	layout = "list",
}: AlertDialogProps) {
	const { colors } = useTheme();
	const haptics = useHaptics();
	const wide = useAccessibilityTextSize();
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
						wide && styles.cardWide,
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
					{layout === "offer" ? (
						<View style={styles.offerActions}>
							{actions.map((action, index) => (
								<Button
									key={action.label}
									buttonRef={index === 0 ? primaryRef : undefined}
									label={action.label}
									variant={index === 0 ? "primary" : "link"}
									onPress={action.onPress}
								/>
							))}
						</View>
					) : null}
					{(layout === "offer" ? [] : actions).map((action) => (
						<Pressable
							key={action.label}
							ref={action.tone === "primary" ? primaryRef : undefined}
							accessibilityRole="button"
							onPress={() => {
								if (action.tone === "destructive") haptics.warning();
								action.onPress();
							}}
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
	cardWide: {
		width: "auto",
		alignSelf: "stretch",
		marginHorizontal: space[400],
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
	offerActions: {
		gap: space[100],
		paddingHorizontal: space[300],
		paddingBottom: space[300],
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
