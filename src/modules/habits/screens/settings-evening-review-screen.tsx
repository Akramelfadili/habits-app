import { useState } from "react";
import { View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { ListItem } from "@/components/ui/composite/list-item";
import { ToggleRow } from "@/components/ui/composite/toggle-row";
import { FieldHelper } from "@/components/ui/primitives/field-helper";
import { ReminderSheet } from "../components/reminder-sheet";
import { NotificationsOffBanner } from "../components/settings/settings-banner";
import {
	SettingsPage,
	settingsGroupStyle,
} from "../components/settings/settings-page";
import { WEEKDAYS } from "../constants";
import { useSettingsActions } from "../hooks/use-settings-actions";
import { useSettingsQueries } from "../hooks/use-settings-queries";
import { reminderSheetCopy, settingsCopy } from "../messages";
import { formatReminderTime } from "../presenters/reminders-helpers";

/** The sheet needs days; the Evening review ignores them (it hides the picker). */
const ALL_DAYS = WEEKDAYS.map(({ day }) => day);

/**
 * Settings > Evening review: the notifications-off notice first when iOS has them off,
 * then the switch and its time (the shared time wheel in a sheet without days), and the
 * rule for when it is sent.
 */
export function SettingsEveningReviewScreen() {
	const settings = useSettingsQueries();
	const actions = useSettingsActions();
	const [isPickingTime, setIsPickingTime] = useState(false);

	return (
		<SettingsPage title={settingsCopy.reminders.evening}>
			{settings.notificationsDenied ? (
				<NotificationsOffBanner body={settingsCopy.denied.eveningBody} />
			) : null}
			<View style={settingsGroupStyle}>
				<Container variant="flat">
					<ToggleRow
						title={settingsCopy.reminders.evening}
						subtitle={settingsCopy.reminders.eveningBody}
						value={settings.eveningReviewEnabled}
						onValueChange={actions.setEveningReview}
					/>
					<ListItem
						title={settingsCopy.reminders.time}
						value={formatReminderTime(settings.eveningReviewTime)}
						navigable
						onPress={() => setIsPickingTime(true)}
					/>
				</Container>
				<FieldHelper plain tone="hint">
					{settingsCopy.reminders.eveningNote}
				</FieldHelper>
			</View>

			<ReminderSheet
				draft={
					isPickingTime
						? { ...settings.eveningReviewTime, weekdays: ALL_DAYS }
						: null
				}
				title={reminderSheetCopy.eveningTime}
				showDays={false}
				onDismiss={() => setIsPickingTime(false)}
				onSave={({ hour, minute }) => {
					setIsPickingTime(false);
					void actions.setEveningReviewTime({ hour, minute });
				}}
			/>
		</SettingsPage>
	);
}
