import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { ListItem } from "@/components/ui/composite/list-item";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { useTheme } from "@/theme/use-theme";
import { ExportSheet } from "../components/export-sheet";
import { LibrarySectionHeader } from "../components/habits/library-section-header";
import {
	SettingsPage,
	settingsGroupStyle,
} from "../components/settings/settings-page";
import { useSettingsQueries } from "../hooks/use-settings-queries";
import { settingsCopy } from "../messages";
import { formatReminderTime } from "../presenters/reminders-helpers";
import {
	notificationValue,
	versionLabel,
} from "../presenters/settings-helpers";

/**
 * Settings, pushed from the Habits gear: a hub of five groups, one row per page: Theme,
 * Evening review and Notifications, Freezes, Export data (the export sheet) and About. Each
 * row shows its current value and a chevron; the pages are `settings-*-screen.tsx`.
 */
export function SettingsScreen() {
	const router = useRouter();
	const { colors } = useTheme();
	const settings = useSettingsQueries();
	const [isExporting, setIsExporting] = useState(false);
	const { size, usedThisMonth } = settings.freezePool;
	const eveningValue = settings.eveningReviewEnabled
		? formatReminderTime(settings.eveningReviewTime)
		: settingsCopy.reminders.off;

	return (
		<SettingsPage title={settingsCopy.title}>
			<View style={settingsGroupStyle}>
				<LibrarySectionHeader label={settingsCopy.groups.appearance} />
				<Container variant="flat">
					<ListItem
						title={settingsCopy.appearance.themeRow}
						value={settingsCopy.appearance.theme[settings.themePreference]}
						leading={<IconBadge symbol="circle.lefthalf.filled" />}
						navigable
						onPress={() => router.push("/settings/appearance")}
					/>
				</Container>
			</View>

			<View style={settingsGroupStyle}>
				<LibrarySectionHeader label={settingsCopy.groups.reminders} />
				<Container variant="flat">
					<ListItem
						title={settingsCopy.reminders.evening}
						value={eveningValue}
						leading={<IconBadge symbol="moon" />}
						navigable
						onPress={() => router.push("/settings/evening-review")}
					/>
					<ListItem
						title={settingsCopy.reminders.notifications}
						value={notificationValue(settings.notificationPermission)}
						leading={<IconBadge symbol="bell" />}
						navigable
						onPress={() => router.push("/settings/notifications")}
					/>
				</Container>
			</View>

			<View style={settingsGroupStyle}>
				<LibrarySectionHeader label={settingsCopy.groups.streaks} />
				<Container variant="flat">
					<ListItem
						title={settingsCopy.streaks.title}
						value={settingsCopy.streaks.leftShort(
							Math.max(0, size - usedThisMonth),
						)}
						leading={
							<IconBadge
								symbol="snowflake"
								accent={{ tint: colors.frozenBg, ink: colors.frozenInk }}
							/>
						}
						navigable
						onPress={() => router.push("/settings/freezes")}
					/>
				</Container>
			</View>

			<View style={settingsGroupStyle}>
				<LibrarySectionHeader label={settingsCopy.groups.data} />
				<Container variant="flat">
					<ListItem
						title={settingsCopy.data.export}
						value={settingsCopy.data.exportValue}
						leading={<IconBadge symbol="square.and.arrow.up" />}
						navigable
						onPress={() => setIsExporting(true)}
					/>
				</Container>
			</View>

			<View style={settingsGroupStyle}>
				<LibrarySectionHeader label={settingsCopy.groups.about} />
				<Container variant="flat">
					<ListItem
						title={settingsCopy.about.title}
						value={versionLabel(settings.about)}
						leading={<IconBadge symbol="info.circle" />}
						navigable
						onPress={() => router.push("/settings/about")}
					/>
				</Container>
			</View>

			<ExportSheet
				visible={isExporting}
				onClose={() => setIsExporting(false)}
			/>
		</SettingsPage>
	);
}
