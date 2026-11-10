import { useRouter } from "expo-router";
import { useRef } from "react";
import {
	type HostInstance,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner } from "@/components/ui/composite/banner";
import { Container } from "@/components/ui/composite/container";
import { ListItem } from "@/components/ui/composite/list-item";
import { Button } from "@/components/ui/primitives/button";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useInitialFocus } from "@/utils/use-initial-focus";
import { leaveFirstRun } from "../first-run-navigation";
import { useFirstRunActions } from "../hooks/use-first-run-actions";
import { firstRunCopy } from "../messages";

/** The three things the app does, each with its glyph. */
const FEATURE_SYMBOLS = {
	today: "checkmark.circle",
	progress: "chart.bar",
	freezes: "snowflake",
} as const;

/**
 * The first thing a new install shows, with no tab bar. One line about the app, the three
 * things it does, and two ways in: Add your first habit (the slim form) or Browse
 * suggestions. Skip for now leads to an empty Today.
 */
export function FirstRunScreen() {
	const router = useRouter();
	const { colors } = useTheme();
	const { markFirstRunSeen, isMarking, markError } = useFirstRunActions();
	const titleRef = useRef<HostInstance>(null);
	// The first heading is where the screen reader starts.
	useInitialFocus(titleRef, true, 100);

	async function skip() {
		const result = await markFirstRunSeen();
		if (result.ok) leaveFirstRun(router);
	}

	return (
		<SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
			<ScrollView contentContainerStyle={styles.content}>
				<View style={styles.hero}>
					<Text
						ref={titleRef}
						accessibilityRole="header"
						accessibilityLabel={firstRunCopy.welcome.title.replace("\n", " ")}
						style={[styles.title, { color: colors.ink }]}
					>
						{firstRunCopy.welcome.title}
					</Text>
					<Text style={[styles.body, { color: colors.sub }]}>
						{firstRunCopy.welcome.body}
					</Text>
				</View>

				<Container variant="flat">
					{firstRunCopy.welcome.features.map((feature) => (
						<ListItem
							key={feature.key}
							title={feature.title}
							subtitle={feature.body}
							leading={<IconBadge symbol={FEATURE_SYMBOLS[feature.key]} />}
						/>
					))}
				</Container>

				<View style={styles.actions}>
					{markError ? (
						<Banner tone="error">{firstRunCopy.continueFailed}</Banner>
					) : null}
					<Button
						label={firstRunCopy.welcome.addFirst}
						onPress={() => router.push("/first-run/habit")}
					/>
					<Button
						label={firstRunCopy.welcome.browse}
						variant="secondary"
						onPress={() => router.push("/suggestions?firstRun=1")}
					/>
					<Button
						label={firstRunCopy.welcome.skip}
						variant="link"
						disabled={isMarking}
						onPress={skip}
					/>
				</View>
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
		gap: space[300],
	},
	title: {
		...textStyles.display,
	},
	body: {
		...textStyles.bodyLg,
	},
	actions: {
		gap: space[200],
	},
});
