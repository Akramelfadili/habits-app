import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ScreenHeader } from "@/components/ui/composite/screen-header";
import { TAB_BAR_BOTTOM_PADDING } from "@/components/ui/composite/tab-bar-pill";
import { space } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type SettingsPageProps = {
	title: string;
	children: ReactNode;
};

export function SettingsPage({ title, children }: SettingsPageProps) {
	const { colors } = useTheme();
	return (
		<View style={[styles.screen, { backgroundColor: colors.bg }]}>
			<ScrollView contentContainerStyle={styles.content}>
				<ScreenHeader title={title} />
				{children}
			</ScrollView>
		</View>
	);
}

export const settingsGroupStyle = {
	gap: space[150],
} as const;

const styles = StyleSheet.create({
	screen: {
		flex: 1,
	},
	content: {
		paddingHorizontal: space[500],
		paddingTop: space[300],
		paddingBottom: TAB_BAR_BOTTOM_PADDING,
		gap: space[500],
	},
});
