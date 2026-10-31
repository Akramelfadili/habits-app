import { useState } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { Banner } from "@/components/ui/composite/banner";
import { Container } from "@/components/ui/composite/container";
import { ListItem } from "@/components/ui/composite/list-item";
import { ScreenHeader } from "@/components/ui/composite/screen-header";
import { TAB_BAR_BOTTOM_PADDING } from "@/components/ui/composite/tab-bar-pill";
import { ToggleRow } from "@/components/ui/composite/toggle-row";
import { FieldHelper } from "@/components/ui/primitives/field-helper";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { copyDiagnostics } from "@/lib/diagnostics/diagnostics";
import { space } from "@/theme/theme";
import type { ThemePreference } from "@/theme/theme-preference-store";
import { useTheme } from "@/theme/use-theme";
import { ExportSheet } from "../components/export-sheet";
import { LibrarySectionHeader } from "../components/habits/library-section-header";
import { EVENING_REVIEW_TIME } from "../constants";
import { useSettingsActions } from "../hooks/use-settings-actions";
import { useSettingsQueries } from "../hooks/use-settings-queries";
import { messages, settingsCopy, showMessage } from "../messages";
import { formatReminderTime } from "../presenters/reminders-helpers";
import { versionLabel } from "../presenters/settings-helpers";

const THEMES: ThemePreference[] = ["light", "dark", "system"];

/**
 * Settings (HAB-44, S1–S7, SY6), pushed from the Habits gear: Appearance
 * (Light, Dark, System — week start and text size are explained, not set),
 * Reminders (the evening review, and what iOS notifications being off holds
 * back), Streaks (the freeze rule in plain words), Data (Export) and About.
 * One screen, one scroll, each group a flat card under its label.
 */
export function SettingsScreen() {
	const { colors } = useTheme();
	const settings = useSettingsQueries();
	const actions = useSettingsActions();
	const [isExporting, setIsExporting] = useState(false);
	const eveningTime = formatReminderTime(EVENING_REVIEW_TIME);
	const { size, usedThisMonth } = settings.freezePool;

	async function handleCopyDiagnostics() {
		const result = await copyDiagnostics();
		const spec =
			result === "copied"
				? messages.diagnosticsCopied
				: result === "shared"
					? messages.diagnosticsShared
					: messages.diagnosticsFailed;
		showMessage(spec, []);
	}

	const permissionValue =
		settings.notificationPermission === "granted"
			? settingsCopy.reminders.allowed
			: settings.notificationPermission === "denied"
				? settingsCopy.reminders.off
				: settingsCopy.reminders.notAsked;

	return (
		<View style={[styles.screen, { backgroundColor: colors.bg }]}>
			<ScrollView contentContainerStyle={styles.content}>
				<ScreenHeader title={settingsCopy.title} />

				<View style={styles.group}>
					<LibrarySectionHeader label={settingsCopy.appearance.header} />
					<Container variant="flat">
						{THEMES.map((preference) => (
							<ListItem
								key={preference}
								embedded
								title={settingsCopy.appearance.theme[preference]}
								subtitle={
									preference === "system"
										? settingsCopy.appearance.systemNow(settings.resolvedScheme)
										: undefined
								}
								selected={settings.themePreference === preference}
								onPress={() => actions.setThemePreference(preference)}
							/>
						))}
					</Container>
					<FieldHelper plain tone="hint">
						{settingsCopy.appearance.note}
					</FieldHelper>
				</View>

				<View style={styles.group}>
					<LibrarySectionHeader label={settingsCopy.reminders.header} />
					{settings.notificationsDenied ? (
						<Banner
							tone="warning"
							symbol="bell.slash"
							title={settingsCopy.denied.title}
							action={{
								label: settingsCopy.denied.action,
								onPress: () => void Linking.openSettings(),
							}}
						>
							{settingsCopy.denied.body}
						</Banner>
					) : null}
					<Container variant="flat">
						<ToggleRow
							title={settingsCopy.reminders.evening}
							subtitle={settingsCopy.reminders.eveningBody}
							value={settings.eveningReviewEnabled}
							onValueChange={actions.setEveningReview}
						/>
						<ListItem
							embedded
							title={settingsCopy.reminders.time}
							value={eveningTime}
						/>
						<ListItem
							embedded
							title={settingsCopy.reminders.notifications}
							value={permissionValue}
						/>
					</Container>
					<FieldHelper plain tone="hint">
						{settingsCopy.reminders.eveningNote}
					</FieldHelper>

					{settings.notificationsDenied ? (
						<>
							<LibrarySectionHeader label={settingsCopy.denied.affected} />
							<Container variant="flat">
								<ListItem
									embedded
									title={settingsCopy.denied.reminders}
									subtitle={settingsCopy.denied.remindersImpact(
										settings.notificationImpact.times,
										settings.notificationImpact.habits,
									)}
								/>
								<ListItem
									embedded
									title={settingsCopy.denied.evening}
									subtitle={settingsCopy.denied.eveningImpact(
										settings.eveningReviewEnabled,
										eveningTime,
									)}
								/>
							</Container>
							<FieldHelper plain tone="hint">
								{settingsCopy.denied.note}
							</FieldHelper>
						</>
					) : null}
				</View>

				<View style={styles.group}>
					<LibrarySectionHeader label={settingsCopy.streaks.header} />
					<Container variant="flat">
						<ListItem
							embedded
							title={settingsCopy.streaks.left}
							value={settingsCopy.streaks.leftValue(
								Math.max(0, size - usedThisMonth),
								size,
							)}
						/>
						<ListItem
							embedded
							title={settingsCopy.streaks.used}
							value={String(usedThisMonth)}
						/>
					</Container>
					<FieldHelper plain tone="hint">
						{settingsCopy.streaks.rule(size)}
					</FieldHelper>
					<FieldHelper plain tone="hint">
						{settingsCopy.streaks.how}
					</FieldHelper>
				</View>

				<View style={styles.group}>
					<LibrarySectionHeader label={settingsCopy.data.header} />
					<Container variant="flat">
						<ListItem
							embedded
							title={settingsCopy.data.export}
							value={settingsCopy.data.exportValue}
							leading={<IconBadge symbol="square.and.arrow.up" />}
							navigable
							onPress={() => setIsExporting(true)}
						/>
					</Container>
				</View>

				<View style={styles.group}>
					<LibrarySectionHeader label={settingsCopy.about.header} />
					<Container variant="flat">
						<ListItem
							embedded
							title={settingsCopy.about.version}
							value={versionLabel(settings.about)}
						/>
						<ListItem
							embedded
							title={settingsCopy.about.copy}
							subtitle={settingsCopy.about.copyBody}
							value={settingsCopy.about.copyValue}
							onPress={handleCopyDiagnostics}
						/>
					</Container>
				</View>
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
		paddingHorizontal: space[500],
		paddingTop: space[300],
		paddingBottom: TAB_BAR_BOTTOM_PADDING,
		gap: space[500],
	},
	group: {
		gap: space[150],
	},
});
