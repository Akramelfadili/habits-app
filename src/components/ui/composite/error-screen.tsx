import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/primitives/button";
import { Caption } from "@/components/ui/primitives/caption";
import { copyDiagnostics } from "@/lib/diagnostics/diagnostics";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type ErrorScreenProps = {
	title: string;
	message: string;
	onRetry: () => void;
};

const COPY_RESULT_MESSAGE = {
	copied: "Diagnostics copied.",
	shared: "Diagnostics ready to share.",
	failed: "Couldn't copy diagnostics.",
} as const;

/**
 * Full-screen recovery (design-system.md, Error screen): what the root error
 * boundary and a failed database migration show instead of a blank or stuck
 * app. It never reads the app database, so it can render when the database
 * is what failed. "Try again" is the caller's retry; "Copy diagnostics" puts
 * the version facts and recent log on the clipboard to paste into a message.
 */
export function ErrorScreen({ title, message, onRetry }: ErrorScreenProps) {
	const { colors } = useTheme();
	const [copyResult, setCopyResult] = useState<
		keyof typeof COPY_RESULT_MESSAGE | null
	>(null);

	async function handleCopy() {
		setCopyResult(await copyDiagnostics());
	}

	return (
		<SafeAreaView
			testID="error-screen"
			style={[styles.screen, { backgroundColor: colors.bg }]}
		>
			<View style={styles.body}>
				<Text
					accessibilityRole="header"
					style={[styles.title, { color: colors.ink }]}
				>
					{title}
				</Text>
				<Text style={[styles.message, { color: colors.sub }]}>{message}</Text>
			</View>
			<View style={styles.actions}>
				<Button label="Try again" onPress={onRetry} />
				<Button
					label="Copy diagnostics"
					variant="secondary"
					onPress={handleCopy}
				/>
				{copyResult ? (
					<Caption tone={copyResult === "failed" ? "error" : "default"}>
						{COPY_RESULT_MESSAGE[copyResult]}
					</Caption>
				) : null}
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		paddingHorizontal: 24,
		paddingBottom: 24,
	},
	body: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
	},
	title: {
		fontSize: typeScale.section,
		fontWeight: "500",
		textAlign: "center",
	},
	message: {
		fontSize: typeScale.subtitle,
		textAlign: "center",
	},
	actions: {
		gap: 10,
	},
});
