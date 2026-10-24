import { Pressable, StyleSheet, Text, View } from "react-native";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { IconBadge } from "../primitives/icon-badge";

type MovedSettingPointerProps = {
	/** What the person was looking for and where it lives now. */
	body: string;
	/** The link, e.g. "Open Settings →". */
	linkLabel: string;
	onPress: () => void;
};

/**
 * NEW-27: points at a setting that moved elsewhere — a hairline, a neutral
 * badge, one line of copy and a link (Reminders' "Open Settings →", HAB-21).
 *
 * TODO(backlog): remove — temporary, for people who look for Evening review where
 * it used to be. Delete this component and its use on Reminders together
 * (see docs/backlog.md).
 */
export function MovedSettingPointer({
	body,
	linkLabel,
	onPress,
}: MovedSettingPointerProps) {
	const { colors, opacity } = useTheme();

	return (
		<View
			testID="moved-setting-pointer"
			style={[styles.root, { borderTopColor: colors.border }]}
		>
			<IconBadge symbol="smallcircle.filled.circle" size="compact" />
			<View style={styles.text}>
				<Text style={[styles.body, { color: colors.sub }]}>{body}</Text>
				<Pressable
					accessibilityRole="link"
					accessibilityLabel={linkLabel}
					onPress={onPress}
					hitSlop={8}
					style={({ pressed }) => pressed && { opacity: opacity.pressed }}
				>
					<Text style={[styles.link, { color: colors.ink }]}>{linkLabel}</Text>
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 12,
		borderTopWidth: StyleSheet.hairlineWidth,
		paddingTop: 16,
	},
	text: {
		flex: 1,
		gap: 8,
	},
	body: {
		fontSize: typeScale.caption,
		lineHeight: 16,
	},
	link: {
		fontSize: typeScale.caption,
		fontWeight: "600",
	},
});
