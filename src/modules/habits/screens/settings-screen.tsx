import { useRouter } from "expo-router";
import { useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { Banner } from "@/components/ui/composite/banner";
import { ListItem } from "@/components/ui/composite/list-item";
import { SettingsGroup } from "@/components/ui/composite/settings-group";
import { Caption } from "@/components/ui/primitives/caption";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { KeyValueRow } from "@/components/ui/primitives/key-value-row";
import { ScopeChip } from "@/components/ui/primitives/scope-chip";
import { SegmentedControl } from "@/components/ui/primitives/segmented-control";
import { Toggle } from "@/components/ui/primitives/toggle";
import { copyDiagnostics } from "@/lib/diagnostics/diagnostics";
import { showToast } from "@/store/toast-store";
import { typeScale } from "@/theme/theme";
import type { ThemePreference } from "@/theme/theme-preference-store";
import { useTheme } from "@/theme/use-theme";
import { ExportSheet } from "../components/export-sheet";
import { EVENING_REVIEW_TIME } from "../constants";
import { useSettingsActions } from "../hooks/use-settings-actions";
import { useSettingsQueries } from "../hooks/use-settings-queries";
import { formatReminderTime } from "../presenters/reminders-helpers";
import {
	appearanceCaption,
	DIAGNOSTICS_RESULT_MESSAGE,
	EVENING_REVIEW_FOOTNOTE,
	exportRowSubtitle,
	NOTIFICATIONS_OFF_NOTICE,
	versionLabel,
} from "../presenters/settings-helpers";

/**
 * Settings (HAB-15, frames B1–B6): Appearance (Light / Dark / System, applied
 * at once) → Reminders (the app-wide Evening review, scoped "All habits") →
 * Categories → Your data (Export, opens the export sheet; Last export).
 *
 * The Categories row has no mockup: it's a plain navigable row, the home
 * HAB-25 expects for Manage Categories.
 */
export function SettingsScreen() {
	const router = useRouter();
	const { colors } = useTheme();
	const settings = useSettingsQueries();
	const actions = useSettingsActions();
	const [isExporting, setIsExporting] = useState(false);

	async function handleCopyDiagnostics() {
		const result = await copyDiagnostics();
		showToast({
			message: DIAGNOSTICS_RESULT_MESSAGE[result],
			tone: result === "failed" ? "error" : "default",
		});
	}

	return (
		<View style={[styles.screen, { backgroundColor: colors.bg }]}>
			<ScrollView contentContainerStyle={styles.content}>
				<Text
					accessibilityRole="header"
					style={[styles.title, { color: colors.ink }]}
				>
					Settings
				</Text>

				<SettingsGroup title="Appearance">
					<SegmentedControl<ThemePreference>
						label="Theme"
						options={[
							{ value: "light", label: "Light" },
							{ value: "dark", label: "Dark" },
							{ value: "system", label: "System" },
						]}
						value={settings.themePreference}
						onChange={(preference) => actions.setThemePreference(preference)}
					/>
					<Caption>
						{appearanceCaption(
							settings.themePreference,
							settings.resolvedScheme,
						)}
					</Caption>
				</SettingsGroup>

				<View style={styles.remindersBlock}>
					<SettingsGroup title="Reminders" footnote={EVENING_REVIEW_FOOTNOTE}>
						<ListItem
							embedded
							title="Evening review"
							subtitle={`One nudge at ${formatReminderTime(EVENING_REVIEW_TIME)} to log anything you missed.`}
							titleAccessory={<ScopeChip label="All habits" />}
							trailing={
								<Toggle
									value={settings.eveningReviewEnabled}
									onValueChange={actions.setEveningReview}
									accessibilityLabel="Evening review"
								/>
							}
						/>
					</SettingsGroup>
					{/* The toggle stays on; this says why nothing will arrive (B2). */}
					{settings.notificationsDenied ? (
						<Banner
							tone="neutral"
							action={{
								label: "Open iOS Settings →",
								onPress: () => void Linking.openSettings(),
							}}
						>
							{NOTIFICATIONS_OFF_NOTICE}
						</Banner>
					) : null}
				</View>

				<SettingsGroup title="Habits">
					<ListItem
						embedded
						title="Categories"
						subtitle="Rename or delete your own"
						navigable
						onPress={() => router.push("/habits/categories")}
					/>
				</SettingsGroup>

				<SettingsGroup title="Your data" dividers>
					<ListItem
						embedded
						title="Export all data"
						subtitle={exportRowSubtitle(
							settings.exportSummary.activeHabits +
								settings.exportSummary.archivedHabits,
							settings.exportSummary.logs,
						)}
						leading={<IconBadge symbol="doc.text" />}
						navigable
						onPress={() => setIsExporting(true)}
					/>
					<KeyValueRow label="Last export" value={settings.lastExport} />
				</SettingsGroup>

				<SettingsGroup title="About" dividers>
					<KeyValueRow label="Version" value={versionLabel(settings.about)} />
					<KeyValueRow
						label="Database schema"
						value={String(settings.about.schemaVersion)}
					/>
					<ListItem
						embedded
						title="Copy diagnostics"
						subtitle="Version info and recent activity, for a bug report"
						leading={<IconBadge symbol="doc.on.doc" />}
						onPress={handleCopyDiagnostics}
					/>
				</SettingsGroup>
			</ScrollView>

			<ExportSheet
				visible={isExporting}
				onClose={() => setIsExporting(false)}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
	},
	content: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 24,
		gap: 16,
	},
	remindersBlock: {
		gap: 10,
	},
	title: {
		fontSize: typeScale.screenTitle,
		fontWeight: "500",
	},
});
