import { AlertDialog } from "@/components/ui/composite/alert-dialog";
import { DEFAULT_REMINDER_TIME } from "../../constants";
import { useFirstRunOfferActions } from "../../hooks/use-first-run-offer-actions";
import { useFirstRunOfferQueries } from "../../hooks/use-first-run-offer-queries";
import { firstRunCopy, messages, showMessage } from "../../messages";
import { formatReminderTime } from "../../presenters/reminders-helpers";

// Our own question first, so the iOS permission prompt is raised only after "Allow reminders".
export function FirstRunReminderOffer() {
	const { habit } = useFirstRunOfferQueries();
	const { allow, notNow, clear } = useFirstRunOfferActions();
	const time = formatReminderTime(DEFAULT_REMINDER_TIME);

	async function onAllow() {
		if (!habit) return;
		clear();
		const result = await allow(habit);
		if (!result.ok) return;
		if (result.value === "granted") showMessage(messages.reminderSaved, [time]);
		else showMessage(messages.reminderSavedOff, []);
	}

	return (
		<AlertDialog
			visible={habit !== null}
			layout="offer"
			title={firstRunCopy.offer.title}
			message={firstRunCopy.offer.body(habit?.name ?? "", time)}
			actions={[
				{
					label: firstRunCopy.offer.allow,
					onPress: onAllow,
					tone: "primary",
				},
				{
					label: firstRunCopy.offer.notNow,
					onPress: notNow,
					tone: "primary",
				},
			]}
			onRequestClose={notNow}
		/>
	);
}
