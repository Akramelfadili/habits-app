import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ScrollView, StyleSheet } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { Sheet } from "@/components/ui/composite/sheet";
import { SheetHeader } from "@/components/ui/composite/sheet-header";
import { Button } from "@/components/ui/primitives/button";
import { TextField } from "@/components/ui/primitives/text-field";
import { MAX_NOTE_LENGTH } from "../constants";
import type { RetroLogDay } from "../hooks/use-retro-log-queries";
import { diffDayLog } from "../services/retro-log";
import type { DayLog } from "../types";
import { RetroLogRow } from "./retro-log-row";
import {
	type RetroLogFormValues,
	retroLogFormSchema,
} from "./retro-log-schema";
import { retroLogTitle } from "./retro-log-sheet-helpers";

type RetroLogSheetProps = {
	/** The day being edited — null hides the sheet. */
	day: RetroLogDay | null;
	onDismiss: () => void;
	/** Only the changed values, plus the note (owned by the habit the sheet was opened from). */
	onSave: (values: DayLog["values"], note: string) => void;
	isSaving?: boolean;
};

/**
 * Retro log (HAB-10), per docs/mockups/retro-log.png: date header with Cancel,
 * the day's habits with their checks, a note, "Save changes" pinned bottom.
 * Edits stay a local draft until Save — Cancel or a scrim tap discards them,
 * same as the Quantity log sheet.
 */
export function RetroLogSheet({
	day,
	onDismiss,
	onSave,
	isSaving = false,
}: RetroLogSheetProps) {
	return (
		<Sheet visible={day !== null} onDismiss={onDismiss}>
			{day ? (
				// Keyed by day, so every opened day starts from its own saved values.
				<RetroLogForm
					key={day.date.getTime()}
					day={day}
					onDismiss={onDismiss}
					onSave={onSave}
					isSaving={isSaving}
				/>
			) : null}
		</Sheet>
	);
}

function RetroLogForm({
	day,
	onDismiss,
	onSave,
	isSaving,
}: RetroLogSheetProps & { day: RetroLogDay }) {
	const [expandedHabitId, setExpandedHabitId] = useState<number | null>(null);
	const {
		control,
		handleSubmit,
		formState: { isDirty },
	} = useForm<RetroLogFormValues>({
		resolver: zodResolver(retroLogFormSchema),
		defaultValues: { values: day.values, note: day.note },
	});

	const save = handleSubmit(({ values, note }) =>
		onSave(diffDayLog(day.values, values), note),
	);

	return (
		<>
			<SheetHeader
				title={retroLogTitle(day.date)}
				// "Cancel", not "Close": the sheet holds an unsaved draft (audit #10).
				actionLabel="Cancel"
				onAction={onDismiss}
			/>

			{/* Capped so a long day's list scrolls instead of pushing Save off-screen. */}
			<ScrollView style={styles.list} bounces={false}>
				<Container>
					{day.habits.map((habit) => (
						<Controller
							key={habit.id}
							control={control}
							name={`values.${habit.id}`}
							render={({ field }) => (
								<RetroLogRow
									habit={habit}
									value={field.value}
									onChange={field.onChange}
									expanded={expandedHabitId === habit.id}
									onToggleExpanded={() =>
										setExpandedHabitId((current) =>
											current === habit.id ? null : habit.id,
										)
									}
								/>
							)}
						/>
					))}
				</Container>
			</ScrollView>

			<Container>
				<Controller
					control={control}
					name="note"
					render={({ field, fieldState }) => (
						<TextField
							label="Note"
							value={field.value}
							onChangeText={field.onChange}
							onBlur={field.onBlur}
							placeholder="Anything worth remembering about this day"
							maxLength={MAX_NOTE_LENGTH}
							multiline
							error={fieldState.error?.message}
						/>
					)}
				/>
			</Container>

			<Button
				label="Save changes"
				onPress={save}
				disabled={!isDirty}
				loading={isSaving}
			/>
		</>
	);
}

const styles = StyleSheet.create({
	list: {
		flexGrow: 0,
		maxHeight: 360,
	},
});
