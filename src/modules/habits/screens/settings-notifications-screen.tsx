import { useRouter } from "expo-router";
import { Linking, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { ListItem } from "@/components/ui/composite/list-item";
import { ToggleRow } from "@/components/ui/composite/toggle-row";
import { FieldHelper } from "@/components/ui/primitives/field-helper";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { LibrarySectionHeader } from "../components/habits/library-section-header";
import { NotificationsOffBanner } from "../components/settings/settings-banner";
import {
	SettingsPage,
	settingsGroupStyle,
} from "../components/settings/settings-page";
import { useSettingsActions } from "../hooks/use-settings-actions";
import { useSettingsQueries } from "../hooks/use-settings-queries";
import { settingsCopy } from "../messages";
import { formatReminderTime } from "../presenters/reminders-helpers";
import { notificationValue } from "../presenters/settings-helpers";

/**
 * Settings > Notifications: when iOS has them off, one banner with Open Settings and what
 * that holds back (reminders, the evening review); otherwise the state and a way to iOS
 * Settings. Times stay editable either way.
 */
export function SettingsNotificationsScreen() {
	const router = useRouter();
	const settings = useSettingsQueries();
	const actions = useSettingsActions();

	return (
		<SettingsPage title={settingsCopy.notificationsPage.title}>
			{settings.notificationsDenied ? (
				<>
					<NotificationsOffBanner body={settingsCopy.denied.body} />
					<View style={settingsGroupStyle}>
						<LibrarySectionHeader label={settingsCopy.denied.affected} />
						<Container variant="flat">
							<ListItem
								title={settingsCopy.denied.reminders}
								subtitle={settingsCopy.denied.remindersImpact(
									settings.notificationImpact.times,
									settings.notificationImpact.habits,
								)}
								leading={<IconBadge symbol="bell" />}
							/>
							<ListItem
								title={settingsCopy.denied.evening}
								subtitle={settingsCopy.denied.eveningImpact(
									settings.eveningReviewEnabled,
									formatReminderTime(settings.eveningReviewTime),
								)}
								leading={<IconBadge symbol="moon" />}
								navigable
								onPress={() => router.push("/settings/evening-review")}
							/>
						</Container>
						<FieldHelper plain tone="hint">
							{settingsCopy.denied.note}
						</FieldHelper>
					</View>
				</>
			) : (
				<View style={settingsGroupStyle}>
					<Container variant="flat">
						<ListItem
							title={settingsCopy.notificationsPage.status}
							value={notificationValue(settings.notificationPermission)}
							leading={<IconBadge symbol="bell" />}
						/>
						<ListItem
							title={settingsCopy.denied.action}
							navigable
							onPress={() => void Linking.openSettings()}
						/>
					</Container>
					<FieldHelper plain tone="hint">
						{settingsCopy.notificationsPage.note}
					</FieldHelper>
				</View>
			)}
			<View style={settingsGroupStyle}>
				<Container variant="flat">
					<ToggleRow
						title={settingsCopy.notificationsPage.hideNames}
						subtitle={settingsCopy.notificationsPage.hideNamesBody}
						value={settings.hideHabitNames}
						onValueChange={actions.setHideHabitNames}
						accessibilityLabel={`${settingsCopy.notificationsPage.hideNames}, ${settingsCopy.notificationsPage.hideNamesBody}`}
					/>
				</Container>
				<FieldHelper plain tone="hint">
					{settingsCopy.notificationsPage.hideNamesHint}
				</FieldHelper>
			</View>
		</SettingsPage>
	);
}
