import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
	type HostInstance,
	Keyboard,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	type ScrollViewInstance,
	StyleSheet,
	Text,
	type TextInputInstance,
	View,
} from "react-native";
import { ActionCard } from "@/components/ui/composite/action-card";
import { AlertDialog } from "@/components/ui/composite/alert-dialog";
import { Banner } from "@/components/ui/composite/banner";
import { Button } from "@/components/ui/primitives/button";
import { Chip } from "@/components/ui/primitives/chip";
import { FieldHelper } from "@/components/ui/primitives/field-helper";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { SegmentedControl } from "@/components/ui/primitives/segmented-control";
import { TextField } from "@/components/ui/primitives/text-field";
import { space } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { failureMessage } from "@/utils/failure-message";
import { runSafely } from "@/utils/run-safely";
import { useInitialFocus } from "@/utils/use-initial-focus";
import { useLeaveGuard } from "@/utils/use-leave-guard";
import { AddCategorySheet } from "../components/add-category-sheet";
import { CategoryChips } from "../components/form/category-chips";
import { FrequencyFields } from "../components/form/frequency-fields";
import { GoalFields } from "../components/form/goal-fields";
import {
	type QueuedReminder,
	ReminderDrafts,
} from "../components/form/reminder-drafts";
import { ReminderSheet } from "../components/reminder-sheet";
import {
	DEFAULT_REMINDER_TIME,
	findBuiltInCategory,
	MAX_HABIT_NAME_LENGTH,
	OTHER_CATEGORY_NAME,
	WEEKDAYS,
} from "../constants";
import { findDuplicateHabit } from "../domain/habit-name-rules";
import { leaveFirstRun } from "../first-run-navigation";
import { useFirstRunOfferStore } from "../first-run-offer-store";
import { useCategoryActions } from "../hooks/use-category-actions";
import { useCategoryQueries } from "../hooks/use-category-queries";
import { useFirstRunActions } from "../hooks/use-first-run-actions";
import { useHabitActions } from "../hooks/use-habit-actions";
import { useHabitDetailActions } from "../hooks/use-habit-detail-actions";
import { useHabitQueries } from "../hooks/use-habit-queries";
import {
	firstRunCopy,
	formCopy,
	messages,
	reminderSheetCopy,
	showMessage,
} from "../messages";
import { formIssues } from "../presenters/habit-form-helpers";
import {
	blankFormValues,
	type HabitFormPrefill,
	parseHabitPrefill,
	prefillToFormValues,
} from "../presenters/habit-form-prefill";
import {
	type HabitFormInput,
	type HabitFormValues,
	makeHabitFormSchema,
	toFrequency,
	toFrequencyFormValues,
} from "../presenters/habit-form-schema";
import {
	FIRST_RUN_QUICK_PICK_IDS,
	findSuggestion,
	type Suggestion,
} from "../suggestions";
import type { FrequencyType, Habit, IsoWeekday, ReminderDraft } from "../types";

type HabitFormScreenProps = {
	/** Present in edit mode; absent when creating a new habit. */
	habitId?: number;
	/** Opens scrolled to this section — "frequency", from an insight's "Change frequency" action (HAB-16). */
	focus?: "frequency";
	/** Opens New habit with this name already in the field — "Add “Yoga” as a habit" from a search with no results (H3). */
	name?: string;
	/** Opens New habit filled in from a suggestion, with the banner saying so (BS2, HAB-46). */
	prefill?: HabitFormPrefill;
	/** The same suggestion as the `prefill` route param (a JSON string); `prefill` wins when both are given. */
	prefillParam?: string;
	/**
	 * Part of First Run (HAB-46): a saved habit marks First Run as seen, offers
	 * FR3's reminder question (unless reminders were queued here) and hands over
	 * to Today, with no way back to the welcome.
	 */
	firstRun?: boolean;
	/** FR2: the slim first-habit form — name, quick picks, type and frequency; nothing else. */
	slim?: boolean;
};

/** The reminder sheet is open on a new time, or on one already queued. */
type SheetState =
	| { kind: "add"; draft: ReminderDraft }
	| { kind: "edit"; key: number; draft: ReminderDraft }
	| null;

const ALL_DAYS: IsoWeekday[] = WEEKDAYS.map(({ day }) => day);

const byTime = (a: ReminderDraft, b: ReminderDraft) =>
	a.hour - b.hour || a.minute - b.minute;

/**
 * Add / Edit habit (HAB-41, F1–F10): one modal form in the order people
 * decide things — Type, Name, Category, Goal, Frequency — with Save pinned at
 * the bottom and, while it is off, the reason under it. Only the name is
 * required; no category means Other. The category supplies the icon and
 * colour. Errors sit next to their fields; closing with edits asks first.
 */
export function HabitFormScreen({
	habitId,
	focus,
	name,
	prefill: prefillProp,
	prefillParam,
	firstRun = false,
	slim = false,
}: HabitFormScreenProps) {
	const prefill = useMemo(
		() => prefillProp ?? parseHabitPrefill(prefillParam),
		[prefillProp, prefillParam],
	);
	const scrollRef = useRef<ScrollViewInstance>(null);
	const unitRef = useRef<TextInputInstance>(null);
	const hasFocused = useRef(false);
	const router = useRouter();
	const { colors } = useTheme();
	const headerHeight = useHeaderHeight();
	const { habits, getHabitById } = useHabitQueries();
	const { categories } = useCategoryQueries();
	const { createHabit, updateHabit, isCreating, isUpdating } =
		useHabitActions();
	const { createCategory, isCreating: isCreatingCategory } =
		useCategoryActions();
	const { archiveHabitOrThrow, restoreHabit, isArchiving } =
		useHabitDetailActions();
	const { markFirstRunSeen } = useFirstRunActions();
	// The quick pick whose hidden fields (category, target) are still in the form (FR2).
	const pickedSuggestion = useRef<Suggestion | null>(null);

	const mode = habitId === undefined ? "create" : "edit";
	const habit = habitId === undefined ? undefined : getHabitById(habitId);
	// A V1 name over the 32 cap stays valid while unchanged (HAB-22).
	const originalName = habit?.name;
	const schema = useMemo(
		() => makeHabitFormSchema(originalName),
		[originalName],
	);
	// The resolver is captured on mount, before an edited habit has loaded.
	const schemaRef = useRef(schema);
	schemaRef.current = schema;
	const hasLoadedEditValues = useRef(false);

	const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [unitTouched, setUnitTouched] = useState(false);
	const [queued, setQueued] = useState<QueuedReminder[]>([]);
	const nextKey = useRef(1);
	const [sheet, setSheet] = useState<SheetState>(null);
	// F1c: a hairline above Save once content scrolls under the pinned header.
	const [isScrolled, setIsScrolled] = useState(false);

	// The starting point is read once: later edits are the person's.
	const initialValues = useRef<HabitFormInput | null>(null);
	if (initialValues.current === null) {
		initialValues.current =
			prefill && mode === "create"
				? prefillToFormValues(prefill, categories)
				: blankFormValues(name);
	}
	const { handleSubmit, watch, setValue, reset, formState } = useForm<
		HabitFormInput,
		unknown,
		HabitFormValues
	>({
		resolver: (values, context, options) =>
			zodResolver(schemaRef.current)(values, context, options),
		mode: "onSubmit",
		defaultValues: initialValues.current,
	});

	useEffect(() => {
		if (mode === "edit" && habit && !hasLoadedEditValues.current) {
			reset({
				...blankFormValues(habit.name),
				categoryId: habit.category.id,
				direction: habit.direction,
				targetType: habit.targetType,
				targetAmount: habit.targetAmount ?? blankFormValues().targetAmount,
				targetUnit: habit.targetUnit ?? "",
				...toFrequencyFormValues(habit.frequency),
			});
			hasLoadedEditValues.current = true;
		}
	}, [mode, habit, reset]);

	const nameValue = watch("name");
	const categoryIdValue = watch("categoryId");
	const directionValue = watch("direction");
	const targetTypeValue = watch("targetType");
	const targetAmountValue = watch("targetAmount");
	const targetUnitValue = watch("targetUnit");
	const frequencyTypeValue = watch("frequencyType");
	const weekdaysValue = watch("weekdays") as IsoWeekday[];
	const timesPerWeekValue = watch("timesPerWeek");

	const isBreak = directionValue === "break";
	const duplicate = findDuplicateHabit(habits, nameValue, habitId);
	const noWeekdays =
		frequencyTypeValue === "weekdays" && weekdaysValue.length === 0;
	const unitBlank =
		targetTypeValue === "quantity" && targetUnitValue.trim().length === 0;
	const issues = formIssues({
		name: nameValue,
		originalName,
		duplicate: duplicate !== undefined,
		noWeekdays,
		unitBlank,
		unitTouched,
	});
	const isSubmitting = isCreating || isUpdating;
	const isSaveDisabled = issues.reason !== undefined || isSubmitting;
	// A failed save moves the screen reader onto the error above Save (08.4).
	const errorRef = useRef<HostInstance>(null);
	useInitialFocus(errorRef, submitError !== null, 100);
	const nameError = !issues.fields.includes("name")
		? undefined
		: duplicate
			? formCopy.name.duplicate(duplicate.name)
			: formCopy.name.tooLong(MAX_HABIT_NAME_LENGTH);

	// Break habits are yes or no: Quantity switches off and resets to Check.
	useEffect(() => {
		if (isBreak && targetTypeValue === "quantity") {
			setValue("targetType", "simple", { shouldDirty: true });
		}
	}, [isBreak, targetTypeValue, setValue]);

	// The days a fresh reminder starts on: the ones the habit can fall on.
	const reminderDays = (): IsoWeekday[] =>
		frequencyTypeValue === "weekdays" && weekdaysValue.length > 0
			? [...weekdaysValue].sort((a, b) => a - b)
			: ALL_DAYS;

	// Closing with edits asks first (F9).
	const guard = useLeaveGuard(formState.isDirty || queued.length > 0);

	// A successful save or archive leaves without asking: stop guarding, then go.
	function close() {
		guard.leaveWith(() => (firstRun ? leaveFirstRun(router) : router.back()));
	}

	// FR2's quick picks fill every field the suggestion knows; category and
	// target stay out of sight and are dropped again if the name is changed.
	function pickSuggestion(suggestion: Suggestion) {
		pickedSuggestion.current = suggestion;
		const values = prefillToFormValues(
			{
				name: suggestion.name,
				category: suggestion.category,
				direction: suggestion.direction,
				target: suggestion.target,
				frequency: suggestion.frequency,
			},
			categories,
		);
		for (const [key, value] of Object.entries(values)) {
			setValue(key as keyof HabitFormInput, value as never, {
				shouldDirty: true,
			});
		}
	}

	function changeName(text: string) {
		const picked = pickedSuggestion.current;
		if (slim && picked && text !== picked.name) {
			pickedSuggestion.current = null;
			const blank = blankFormValues();
			setValue("categoryId", blank.categoryId, { shouldDirty: true });
			setValue("targetType", blank.targetType, { shouldDirty: true });
			setValue("targetAmount", blank.targetAmount, { shouldDirty: true });
			setValue("targetUnit", blank.targetUnit, { shouldDirty: true });
		}
		setValue("name", text, { shouldDirty: true });
	}

	async function onSubmit(values: HabitFormValues) {
		const other = findBuiltInCategory(categories, OTHER_CATEGORY_NAME);
		// No category picked means Other (HAB-41).
		const categoryId = values.categoryId ?? other?.id;
		const frequency = toFrequency(values);
		// Stale Amount/Unit input never leaks in if Quantity was picked, then
		// switched back to Check — a simple-check habit always has null.
		const targetAmount =
			values.targetType === "quantity" ? values.targetAmount : null;
		const targetUnit =
			values.targetType === "quantity" ? values.targetUnit.trim() : null;

		// This modal has no ToastHost (it sits above the Habits stack), so a
		// failed save is shown inline, above Save — the form stays as it was,
		// and a retry is one tap. `runSafely` also logs it and never rejects.
		setSubmitError(null);
		let remindersFailed = false;
		let savedHabit: Habit | undefined;
		const result = await runSafely(
			{
				scope: "habit-form",
				failure: failureMessage("save", "this habit"),
				onFailure: (_error, message) => setSubmitError(message),
			},
			async () => {
				if (categoryId === undefined) {
					throw new Error("The built-in Other category is missing");
				}
				if (mode === "create") {
					const created = await createHabit(
						{
							name: values.name,
							categoryId,
							direction: values.direction,
							targetType: values.targetType,
							targetAmount,
							targetUnit,
							frequency,
						},
						queued.map(({ hour, minute, weekdays }) => ({
							hour,
							minute,
							weekdays,
						})),
					);
					remindersFailed = created.remindersFailed;
					savedHabit = created.habit;
				} else if (habitId !== undefined) {
					await updateHabit(habitId, {
						name: values.name,
						categoryId,
						targetType: values.targetType,
						targetAmount,
						targetUnit,
						frequency,
					});
				}
			},
		);
		if (!result.ok) return;
		if (remindersFailed) showMessage(messages.habitSavedReminderFailed, []);
		if (firstRun) {
			// The habit is saved, so the gate is done either way; a failed flag write only costs the one-time mark.
			await markFirstRunSeen();
			if (savedHabit && queued.length === 0) {
				useFirstRunOfferStore.getState().offer(savedHabit);
			}
		}
		close();
	}

	// Archiving is reversible, so it's one tap with an Undo toast — the same as
	// Detail's (HAB-13/20). This modal has no ToastHost, so a failure is shown
	// inline; the toast is raised for the screen underneath, as the form closes.
	async function handleArchive() {
		if (habitId === undefined || !habit) return;
		const { name: archivedName } = habit;
		setSubmitError(null);
		const result = await runSafely(
			{
				scope: "habit-form",
				failure: failureMessage("archive", "this habit"),
				onFailure: (_error, message) => setSubmitError(message),
			},
			() => archiveHabitOrThrow(habitId),
		);
		if (!result.ok) return;
		showMessage(messages.habitArchived, [archivedName], () =>
			restoreHabit(habitId),
		);
		close();
	}

	function saveReminder(draft: ReminderDraft) {
		if (!sheet) return;
		setQueued((current) =>
			(sheet.kind === "add"
				? [...current, { ...draft, key: nextKey.current++ }]
				: current.map((item) =>
						item.key === sheet.key ? { ...item, ...draft } : item,
					)
			).sort(byTime),
		);
		setSheet(null);
	}

	if (mode === "edit" && !habit) {
		return (
			<View style={[styles.loading, { backgroundColor: colors.bg }]}>
				<Text style={{ color: colors.sub }}>{formCopy.loading}</Text>
			</View>
		);
	}

	const typeField = (
		<View style={styles.field}>
			<SectionLabel>{formCopy.type.label}</SectionLabel>
			<SegmentedControl
				label={formCopy.type.label}
				options={[
					{ value: "build", label: formCopy.type.build },
					{ value: "break", label: formCopy.type.break },
				]}
				value={directionValue}
				onChange={(value) =>
					setValue("direction", value, { shouldDirty: true })
				}
				disabled={mode === "edit"}
			/>
			{mode === "edit" ? (
				<FieldHelper plain tone="hint">
					{formCopy.type.locked}
				</FieldHelper>
			) : isBreak ? (
				<FieldHelper plain tone="hint">
					{formCopy.type.breakNote}
				</FieldHelper>
			) : null}
		</View>
	);

	const nameField = (
		<TextField
			label={formCopy.name.label}
			placeholder={formCopy.name.placeholder}
			value={nameValue}
			onChangeText={changeName}
			error={nameError}
			maxLength={MAX_HABIT_NAME_LENGTH}
			limitMessage={formCopy.name.limit}
			autoFocus={mode === "create"}
			// Return goes on to Unit when a quantity habit has one; otherwise
			// it just puts the keyboard away — never saves a half-filled form.
			returnKeyType={targetTypeValue === "quantity" ? "next" : "done"}
			onSubmitEditing={() =>
				targetTypeValue === "quantity"
					? unitRef.current?.focus()
					: Keyboard.dismiss()
			}
		/>
	);

	// FR2: five of the bundle, one tap each; the chip whose name is in the field reads as picked.
	const quickPicks = (
		<View style={styles.field}>
			<SectionLabel>{firstRunCopy.habit.pickLabel}</SectionLabel>
			<View style={styles.chips}>
				{FIRST_RUN_QUICK_PICK_IDS.map((id) => {
					const suggestion = findSuggestion(id);
					if (!suggestion) return null;
					return (
						<Chip
							key={id}
							label={suggestion.name}
							selected={nameValue === suggestion.name}
							onPress={() => pickSuggestion(suggestion)}
						/>
					);
				})}
			</View>
		</View>
	);

	return (
		// The name field autofocuses on create (HAB-22), so the keyboard is up
		// from the first frame: lift the pinned Save and its reason above it.
		// The offset is the stack header — this view's frame starts below it.
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : undefined}
			keyboardVerticalOffset={headerHeight}
			style={[styles.screen, { backgroundColor: colors.bg }]}
		>
			<ScrollView
				ref={scrollRef}
				testID="habit-form-scroll"
				// A chip tap with the keyboard up acts on the first tap, not just dismisses.
				keyboardShouldPersistTaps="handled"
				// Scrolling the form away from a field puts the keyboard away too.
				keyboardDismissMode="on-drag"
				contentContainerStyle={styles.scrollContent}
				scrollEventThrottle={16}
				onScroll={(event) =>
					setIsScrolled(event.nativeEvent.contentOffset.y > 0)
				}
			>
				{prefill && mode === "create" && !slim ? (
					<Banner
						tone="neutral"
						symbol="sparkles"
						title={formCopy.prefill.title}
					>
						{formCopy.prefill.body(prefill.name)}
					</Banner>
				) : null}

				{slim ? null : typeField}
				{nameField}
				{slim ? quickPicks : null}
				{slim ? typeField : null}

				{slim ? null : (
					<CategoryChips
						categories={categories}
						selectedId={categoryIdValue}
						onSelect={(id) => setValue("categoryId", id, { shouldDirty: true })}
						onAdd={() => setIsAddCategoryOpen(true)}
					/>
				)}

				{slim ? null : (
					<GoalFields
						direction={directionValue}
						targetType={targetTypeValue}
						targetAmount={targetAmountValue}
						targetUnit={targetUnitValue}
						unitError={
							unitBlank && unitTouched ? formCopy.goal.unitMissing : undefined
						}
						onTargetType={(value) =>
							setValue("targetType", value, { shouldDirty: true })
						}
						onTargetAmount={(value) =>
							setValue("targetAmount", value, { shouldDirty: true })
						}
						onTargetUnit={(value) =>
							setValue("targetUnit", value, { shouldDirty: true })
						}
						onUnitBlur={() => setUnitTouched(true)}
						unitRef={unitRef}
						// The Unit field is low on the form — bring it clear of the keyboard.
						onUnitFocus={() =>
							scrollRef.current?.scrollToEnd({ animated: true })
						}
					/>
				)}

				<View
					testID="habit-form-frequency"
					onLayout={(event) => {
						if (focus !== "frequency" || hasFocused.current) return;
						hasFocused.current = true;
						scrollRef.current?.scrollTo({
							y: Math.max(0, event.nativeEvent.layout.y - space[200]),
							animated: false,
						});
					}}
				>
					<FrequencyFields
						frequencyType={frequencyTypeValue}
						weekdays={weekdaysValue}
						timesPerWeek={timesPerWeekValue}
						noDaysError={noWeekdays}
						onFrequencyType={(value: FrequencyType) =>
							setValue("frequencyType", value, { shouldDirty: true })
						}
						onWeekdays={(days) =>
							setValue("weekdays", days, { shouldDirty: true })
						}
						onTimesPerWeek={(value) =>
							setValue("timesPerWeek", value, { shouldDirty: true })
						}
					/>
				</View>

				{slim ? (
					<FieldHelper plain tone="hint">
						{firstRunCopy.habit.note}
					</FieldHelper>
				) : null}

				{mode === "create" && !slim ? (
					<ReminderDrafts
						reminders={queued}
						onAdd={() =>
							setSheet({
								kind: "add",
								draft: { ...DEFAULT_REMINDER_TIME, weekdays: reminderDays() },
							})
						}
						onEdit={(reminder) =>
							setSheet({
								kind: "edit",
								key: reminder.key,
								draft: {
									hour: reminder.hour,
									minute: reminder.minute,
									weekdays: reminder.weekdays,
								},
							})
						}
						onRemove={(reminder) =>
							setQueued((current) =>
								current.filter((item) => item.key !== reminder.key),
							)
						}
					/>
				) : null}

				{mode === "edit" && habit?.archivedAt === null ? (
					<ActionCard
						title={formCopy.archive.title}
						subtitle={formCopy.archive.body}
						symbol="archivebox"
						disabled={isArchiving || isSubmitting}
						onPress={handleArchive}
					/>
				) : null}
			</ScrollView>

			<View
				testID="habit-form-footer"
				style={[
					styles.footer,
					isScrolled && {
						borderTopWidth: StyleSheet.hairlineWidth,
						borderTopColor: colors.border,
					},
				]}
			>
				{submitError ? (
					<Banner tone="error" messageRef={errorRef}>
						{submitError}
					</Banner>
				) : null}
				<Button
					label={mode === "create" ? formCopy.save.new : formCopy.save.edit}
					onPress={handleSubmit(onSubmit)}
					disabled={isSaveDisabled}
					// 08.3: a dimmed Save reads its reason as the hint ("Add a name to save").
					accessibilityHint={isSaveDisabled ? issues.reason : undefined}
					loading={isSubmitting}
				/>
				{isSaveDisabled && issues.reason ? (
					<FieldHelper align="center" plain tone="blocking">
						{issues.reason}
					</FieldHelper>
				) : null}
			</View>

			<AddCategorySheet
				visible={isAddCategoryOpen}
				categories={categories}
				onDismiss={() => setIsAddCategoryOpen(false)}
				onCreate={createCategory}
				onCreated={(category) => {
					// F2d: back to the chips with the new one already selected.
					setValue("categoryId", category.id, { shouldDirty: true });
					setIsAddCategoryOpen(false);
				}}
				isCreating={isCreatingCategory}
			/>
			<ReminderSheet
				draft={sheet?.draft ?? null}
				title={
					sheet?.kind === "edit"
						? reminderSheetCopy.edit
						: reminderSheetCopy.add
				}
				onDismiss={() => setSheet(null)}
				onSave={saveReminder}
			/>
			<AlertDialog
				visible={guard.prompting}
				title={formCopy.discard.title}
				message={
					mode === "edit" && originalName
						? formCopy.discard.bodyEdit(originalName)
						: formCopy.discard.bodyNew
				}
				actions={[
					{
						label: formCopy.discard.keep,
						onPress: guard.keep,
						tone: "primary",
					},
					{
						label: formCopy.discard.discard,
						onPress: guard.leave,
						tone: "destructive",
					},
				]}
				onRequestClose={guard.keep}
			/>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: space[500],
		paddingTop: space[300],
		paddingBottom: space[500],
		gap: space[400],
	},
	loading: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	field: {
		gap: space[150],
	},
	chips: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: space[100],
	},
	footer: {
		gap: space[200],
		paddingHorizontal: space[500],
		paddingBottom: space[400],
		paddingTop: space[200],
	},
});
