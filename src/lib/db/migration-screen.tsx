import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import {
	type HostInstance,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Container } from "@/components/ui/composite/container";
import { ProgressBar } from "@/components/ui/composite/progress-bar";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useInitialFocus } from "@/utils/use-initial-focus";
import type { DatabaseCopy } from "./database-copy";

type MigrationScreenProps = {
	copy: DatabaseCopy["updating"];
};

/**
 * SY3: shown in place of the tabs on the first launch after an update that
 * changes how habits are stored. There is no step or count to give — the
 * migrator is one synchronous run with no progress to report — so the bar is
 * indeterminate and says only what is happening. No cancel: stopping halfway
 * would help no one, and the run is all-or-nothing anyway.
 *
 * The splash is held until the saved Appearance loads, which needs the
 * database, so it has to be dropped here or this screen would never be seen.
 */
export function MigrationScreen({ copy }: MigrationScreenProps) {
	const { colors } = useTheme();
	const titleRef = useRef<HostInstance>(null);
	useInitialFocus(titleRef, true, 100);

	useEffect(() => {
		SplashScreen.hide();
	}, []);

	return (
		<SafeAreaView
			testID="migration-screen"
			style={[styles.screen, { backgroundColor: colors.bg }]}
		>
			<ScrollView contentContainerStyle={styles.content}>
				<View style={styles.hero}>
					<Text
						ref={titleRef}
						accessibilityRole="header"
						style={[styles.title, { color: colors.ink }]}
					>
						{copy.title}
					</Text>
					<Text style={[styles.body, { color: colors.sub }]}>{copy.body}</Text>
				</View>
				<Container variant="card">
					<ProgressBar value={0} indeterminate label={copy.progress} />
				</Container>
				<Text style={[styles.keepOpen, { color: colors.sub }]}>
					{copy.keepOpen}
				</Text>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
	},
	content: {
		flexGrow: 1,
		justifyContent: "center",
		paddingHorizontal: space[500],
		paddingVertical: space[800],
		gap: space[500],
	},
	hero: {
		gap: space[200],
	},
	title: {
		...textStyles.display,
	},
	body: {
		...textStyles.bodyLg,
	},
	keepOpen: {
		...textStyles.footnote,
	},
});
