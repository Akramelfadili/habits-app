import { useRef, useState } from "react";
import {
	type HostInstance,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/primitives/button";
import { Caption } from "@/components/ui/primitives/caption";
import { copyDiagnostics } from "@/lib/diagnostics/diagnostics";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useInitialFocus } from "@/utils/use-initial-focus";
import { Banner } from "./banner";

type ErrorScreenProps = {
	title: string;
	message: string;
	/** Omitted when trying again cannot help (data from a newer version). */
	onRetry?: () => void;
	/**
	 * A last-resort way out under Copy diagnostics (audit C-03): a quieter
	 * button, never the default. The caller owns the confirm it opens.
	 */
	recovery?: { label: string; hint?: string; onPress: () => void };
	/**
	 * Why it stopped, as an error banner under the message (SY4): a title and
	 * what that means for the person's data. Never raw error text.
	 */
	reason?: { title: string; message: string };
};

const COPY_RESULT_MESSAGE = {
	copied: "Diagnostics copied.",
	shared: "Diagnostics ready to share.",
	failed: "Couldn't copy diagnostics.",
} as const;

/**
 * Full-screen recovery (SY4, design-system.md Error screen): what the root
 * error boundary and a failed database migration show instead of a blank or
 * stuck app. A hero title, one line of reassurance, optionally the reason in
 * an error banner, then Try again and Copy diagnostics. It never reads the app
 * database, so it can render when the database is what failed, and it has no
 * toast host to lean on, so the copy result is said inline.
 */
export function ErrorScreen({
	title,
	message,
	onRetry,
	recovery,
	reason,
}: ErrorScreenProps) {
	const { colors } = useTheme();
	const [copyResult, setCopyResult] = useState<
		keyof typeof COPY_RESULT_MESSAGE | null
	>(null);
	const titleRef = useRef<HostInstance>(null);
	// 08.4: the screen reader starts on the heading.
	useInitialFocus(titleRef, true, 100);

	async function handleCopy() {
		setCopyResult(await copyDiagnostics());
	}

	return (
		<SafeAreaView
			testID="error-screen"
			style={[styles.screen, { backgroundColor: colors.bg }]}
		>
			<ScrollView contentContainerStyle={styles.content}>
				<View style={styles.hero}>
					<Text
						ref={titleRef}
						accessibilityRole="header"
						style={[styles.title, { color: colors.ink }]}
					>
						{title}
					</Text>
					<Text style={[styles.message, { color: colors.sub }]}>{message}</Text>
				</View>
				{reason ? (
					<Banner
						tone="error"
						symbol="exclamationmark.circle"
						title={reason.title}
					>
						{reason.message}
					</Banner>
				) : null}
				<View style={styles.actions}>
					{onRetry ? <Button label="Try again" onPress={onRetry} /> : null}
					<Button
						label="Copy diagnostics"
						variant={onRetry ? "secondary" : "primary"}
						onPress={handleCopy}
					/>
					{recovery ? (
						<Button
							label={recovery.label}
							variant="secondary"
							accessibilityHint={recovery.hint}
							onPress={recovery.onPress}
						/>
					) : null}
					{copyResult ? (
						<Caption tone={copyResult === "failed" ? "error" : "default"}>
							{COPY_RESULT_MESSAGE[copyResult]}
						</Caption>
					) : null}
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
		gap: space[200],
	},
	title: {
		...textStyles.display,
	},
	message: {
		...textStyles.bodyLg,
	},
	actions: {
		gap: space[200],
	},
});
