import { format, isAfter, startOfDay } from "date-fns";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { Sheet } from "@/components/ui/composite/sheet";
import { SheetHeader } from "@/components/ui/composite/sheet-header";
import { ToastHost } from "@/components/ui/composite/toast-host";
import { Button } from "@/components/ui/primitives/button";
import { TextField } from "@/components/ui/primitives/text-field";
import { currentDay } from "@/lib/today/use-today";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { MAX_NOTE_LENGTH } from "../constants";
import { isDayLogValueDone } from "../domain/retro-log";
import { useDayNoteActions } from "../hooks/use-day-note-actions";
import type { RetroLogDay } from "../hooks/use-retro-log-queries";
import { useTodayActions } from "../hooks/use-today-actions";
import { messages, showMessage, todayCopy } from "../messages";
import { editDayRowStatus } from "../presenters/edit-day-status";
import type { Habit } from "../types";
import { editDayTitle } from "./edit-day-helpers";
import { HabitRow } from "./habit-row";
import { QuantityLogSheet } from "./quantity-log-sheet";

type EditDaySheetProps = {
	/** The day being edited — null hides the sheet. */
	day: RetroLogDay | null;
	onDismiss: () => void;
};

/**
 * Edit this day (HAB-34, RL1–RL3): one sheet for any past day. Every habit due
 * that day sits in a row with its circle; a tap saves at once and a toast
 * above Done names the date and offers Undo. Quantity rows open the quantity
 * sheet for that date. A frozen day shows the violet circle, and logging it
 * returns the freeze (PR-11). Future days are not editable.
 */
export function EditDaySheet({ day, onDismiss }: EditDaySheetProps) {
	const { colors } = useTheme();
	const { toggleCompletion, restoreDay } = useTodayActions();
	const { saveNote } = useDayNoteActions();
	const [quantityHabit, setQuantityHabit] = useState<Habit | null>(null);
	// The origin habit's note for the day, saved when the sheet closes (a note is
	// text, not a tap: it has no Undo toast of its own).
	const [note, setNote] = useState<{ key: number; text: string } | null>(null);

	if (!day) return <Sheet visible={false} onDismiss={onDismiss} />;

	const noteText = note?.key === day.date.getTime() ? note.text : day.note;
	async function close() {
		const habitId = day?.originHabitId;
		if (day && habitId !== undefined && noteText !== day.note) {
			const result = await saveNote(day.date, habitId, noteText);
			// A failed save keeps the sheet open, with its error toast, for a retry.
			if (!result.ok) return;
		}
		onDismiss();
	}

	const date = day.date;
	const dateLabel = format(date, "EEE d");
	const dateLongLabel = format(date, "EEE d MMM");
	const isFuture = isAfter(startOfDay(date), startOfDay(currentDay()));

	async function tap(habit: Habit) {
		const done = isDayLogValueDone(habit, day?.values[habit.id] ?? false);
		const result = await toggleCompletion(habit.id, date, !done);
		if (!result.ok) return;
		const undo = () =>
			restoreDay(habit.id, date, done, result.value.returnedFreeze ?? null);
		if (result.value.returnedFreeze) {
			showMessage(
				messages.freezeReturned,
				[dateLabel, result.value.freezesLeft],
				undo,
			);
		} else if (done) {
			showMessage(messages.dayCleared, [habit.name, dateLabel], undo);
		} else {
			showMessage(
				habit.direction === "break" ? messages.dayResisted : messages.dayLogged,
				[habit.name, dateLabel],
				undo,
			);
		}
	}

	return (
		<>
			<Sheet visible onDismiss={close} toast="inline">
				<SheetHeader
					title={editDayTitle(date)}
					actionLabel={todayCopy.quantityClose}
					onAction={close}
				/>
				{isFuture ? (
					<Text style={[styles.note, { color: colors.sub }]}>
						{todayCopy.cantLogAhead}
					</Text>
				) : day.habits.length === 0 ? (
					<Text style={[styles.note, { color: colors.sub }]}>
						{todayCopy.editDayNothingDue}
					</Text>
				) : (
					<>
						<Text style={[styles.note, { color: colors.sub }]}>
							{todayCopy.editDayIntro}
						</Text>
						<Container variant="flat">
							{day.habits.map((habit) => {
								const value = day.values[habit.id] ?? false;
								const done = isDayLogValueDone(habit, value);
								const frozen = day.frozenHabitIds.has(habit.id);
								const isQuantity = habit.targetType === "quantity";
								return (
									<HabitRow
										key={habit.id}
										habit={habit}
										completed={done}
										frozen={frozen && !done}
										circleAction={isQuantity ? "amount" : "log"}
										quantityValue={typeof value === "number" ? value : 0}
										status={editDayRowStatus(habit, value, frozen)}
										onToggle={() => tap(habit)}
										// Quantity rows open the sheet for that date: no +1 here.
										onIncrement={() => setQuantityHabit(habit)}
										onOpenQuantitySheet={
											isQuantity ? () => setQuantityHabit(habit) : undefined
										}
									/>
								);
							})}
						</Container>
					</>
				)}
				{day.originHabitId !== undefined && !isFuture ? (
					<Container>
						<TextField
							label={todayCopy.editDayNoteLabel}
							value={noteText}
							onChangeText={(text) =>
								setNote({ key: day.date.getTime(), text })
							}
							placeholder={todayCopy.editDayNotePlaceholder}
							maxLength={MAX_NOTE_LENGTH}
							multiline
						/>
					</Container>
				) : null}
				<View>
					<ToastHost placement="inline" />
				</View>
				<Button label={todayCopy.editDayDone} onPress={close} />
			</Sheet>
			{quantityHabit ? (
				<QuantityLogSheet
					habit={quantityHabit}
					value={
						typeof day.values[quantityHabit.id] === "number"
							? (day.values[quantityHabit.id] as number)
							: 0
					}
					day={date}
					dayLabel={dateLongLabel}
					onClosed={() => setQuantityHabit(null)}
				/>
			) : null}
		</>
	);
}

const styles = StyleSheet.create({
	note: {
		...textStyles.footnote,
		paddingHorizontal: space[100],
	},
});
