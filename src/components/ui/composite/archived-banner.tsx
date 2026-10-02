import { SymbolView } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { Button } from "../primitives/button";

type ArchivedBannerProps = {
	/** "Archived on 2 September" — the archive date, spelled out. */
	title: string;
	/** "Hidden from Today. All 41 logs kept." */
	detail: string;
	/**
	 * "default" shows the banner with Restore at the top of Detail (NEW-13,
	 * HAB-20 D5). "dismissed" is the same banner collapsed in place — Restore
	 * is instant, so the user stays on Detail while it closes (E1).
	 */
	state?: "default" | "dismissed";
	onRestore: () => void;
	/** A restore is in flight — Restore can't be tapped twice. */
	disabled?: boolean;
};

/** Detail's archived banner (NEW-13): date, what it means, and Restore — never a confirmation. */
export function ArchivedBanner({
	title,
	detail,
	state = "default",
	onRestore,
	disabled = false,
}: ArchivedBannerProps) {
	const { colors } = useTheme();
	if (state === "dismissed") return null;

	return (
		<View
			testID="archived-banner"
			style={[
				styles.banner,
				{ backgroundColor: colors.card, borderColor: colors.border },
			]}
		>
			<View style={[styles.icon, { backgroundColor: colors.inner }]}>
				<SymbolView name="archivebox" size={14} tintColor={colors.sub} />
			</View>
			<View style={styles.text}>
				<Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
				<Text style={[styles.detail, { color: colors.sub }]}>{detail}</Text>
			</View>
			<Button
				label="Restore"
				variant="secondary"
				size="small"
				fullWidth={false}
				disabled={disabled}
				onPress={onRestore}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	banner: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		borderRadius: 16,
		borderWidth: StyleSheet.hairlineWidth,
		padding: 12,
	},
	icon: {
		width: 30,
		height: 30,
		borderRadius: 9,
		alignItems: "center",
		justifyContent: "center",
	},
	text: {
		flex: 1,
		gap: 2,
	},
	title: {
		fontSize: typeScale.subtitle,
		fontWeight: "500",
	},
	detail: {
		fontSize: typeScale.caption,
	},
});
