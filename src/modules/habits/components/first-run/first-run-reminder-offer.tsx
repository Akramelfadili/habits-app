import { AlertDialog } from "@/components/ui/composite/alert-dialog";
import { DEFAULT_REMINDER_TIME } from "../../constants";
import { useFirstRunOfferActions } from "../../hooks/use-first-run-offer-actions";
import { useFirstRunOfferQueries } from "../../hooks/use-first-run-offer-queries";
import { firstRunCopy, messages, showMessage } from "../../messages";
import { formatReminderTime } from "../../presenters/reminders-helpers";

/**
 * FR3: our own question, before iOS gets to ask. Shown on Today right after
 * the first habit is saved. "Allow reminders" adds the default 09:00 reminder
 * and only then raises the iOS prompt; "Not now" does nothing, and iOS is
 * asked the first time a reminder is added later.
 */
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
