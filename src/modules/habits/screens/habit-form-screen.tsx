import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
	Keyboard,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	type TextInput,
	View,
} from "react-native";
import { ActionCard } from "@/components/ui/composite/action-card";
import { Banner } from "@/components/ui/composite/banner";
import { Container } from "@/components/ui/composite/container";
import { ListItem } from "@/components/ui/composite/list-item";
import { WeekdayPicker } from "@/components/ui/composite/weekday-picker";
import { Button } from "@/components/ui/primitives/button";
import { Caption } from "@/components/ui/primitives/caption";
import { Chip } from "@/components/ui/primitives/chip";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { SegmentedControl } from "@/components/ui/primitives/segmented-control";
import { Stepper } from "@/components/ui/primitives/stepper";
import { TextField } from "@/components/ui/primitives/text-field";
import { showToast } from "@/store/toast-store";
import { useTheme } from "@/theme/use-theme";
import { failureMessage } from "@/utils/failure-message";
import { runSafely } from "@/utils/run-safely";
import { AddCategorySheet } from "../components/add-category-sheet";
import { CategoryPicker } from "../components/category-picker";
import {
	DEFAULT_TARGET_AMOUNT,
	DIRECTION_CAPTIONS,
	MAX_HABIT_NAME_LENGTH,
	MAX_TARGET_AMOUNT,
	MAX_TIMES_PER_WEEK,
	MIN_TARGET_AMOUNT,
	MIN_TIMES_PER_WEEK,
	QUANTITY_UNAVAILABLE_FOR_BREAK_CAPTION,
	WEEKDAY_SHORTCUT,
	WEEKDAYS,
} from "../constants";
import { useCategoryActions } from "../hooks/use-category-actions";
import { useCategoryQueries } from "../hooks/use-category-queries";
import { useHabitActions } from "../hooks/use-habit-actions";
import { useHabitDetailActions } from "../hooks/use-habit-detail-actions";
import { useHabitQueries } from "../hooks/use-habit-queries";
import { saveBlockedReason } from "../presenters/habit-form-helpers";
import {
	DEFAULT_FREQUENCY_FORM_VALUES,
	type HabitFormInput,
	type HabitFormValues,
	makeHabitFormSchema,
	NO_WEEKDAYS_MESSAGE,
	toFrequency,
	toFrequencyFormValues,
} from "../presenters/habit-form-schema";
import type { FrequencyType } from "../types";

/** E5: an example, not a default value — the field opens empty (HAB-22). */
const NAME_PLACEHOLDER = "e.g. Drink a glass of water";

const FREQUENCY_MODES: { value: FrequencyType; label: string }[] = [
	{ value: "daily", label: "Daily" },
	{ value: "weekdays", label: "Specific weekdays" },
	{ value: "per-week", label: "X per week" },
];

type HabitFormScreenProps = {
	/** Present in edit mode; absent when creating a new habit. */
	habitId?: number;
	/** Opens scrolled to this section — "frequency", from an insight's "Reschedule habit" action (HAB-16). */
	focus?: "frequency";
};

export function HabitFormScreen({ habitId, focus }: HabitFormScreenProps) {
	const scrollRef = useRef<ScrollView>(null);
	const unitRef = useRef<TextInput>(null);
	const hasFocused = useRef(false);
	const router = useRouter();
	const { colors } = useTheme();
	const headerHeight = useHeaderHeight();
	const { getHabitById } = useHabitQueries();
	const { categories } = useCategoryQueries();
	const { createHabit, updateHabit, isCreating, isUpdating } =
		useHabitActions();
	const { createCategory, isCreating: isCreatingCategory } =
		useCategoryActions();
	const { archiveHabitOrThrow, restoreHabit, isArchiving } =
		useHabitDetailActions();

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
	// F1c: a hairline above Save once content scrolls under the pinned header.
	const [isScrolled, setIsScrolled] = useState(false);

	const { control, handleSubmit, watch, setValue, reset } = useForm<
		HabitFormInput,
		unknown,
		HabitFormValues
	>({
		resolver: (values, context, options) =>
			zodResolver(schemaRef.current)(values, context, options),
		mode: "onBlur",
		defaultValues: {
			name: "",
			categoryId: null,
			direction: "build",
			targetType: "simple",
			targetAmount: DEFAULT_TARGET_AMOUNT,
			targetUnit: "",
			...DEFAULT_FREQUENCY_FORM_VALUES,
		},
	});

	useEffect(() => {
		if (mode === "edit" && habit && !hasLoadedEditValues.current) {
			reset({
				name: habit.name,
				categoryId: habit.category.id,
				direction: habit.direction,
				targetType: habit.targetType,
				targetAmount: habit.targetAmount ?? DEFAULT_TARGET_AMOUNT,
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
	const weekdaysValue = watch("weekdays");
	const timesPerWeekValue = watch("timesPerWeek");

	const hasNoWeekdays =
		frequencyTypeValue === "weekdays" && weekdaysValue.length === 0;
	const hasNoTargetUnit =
		targetTypeValue === "quantity" && targetUnitValue.trim().length === 0;
	const isSubmitting = isCreating || isUpdating;
	const blockedReason = saveBlockedReason({
		name: nameValue,
		categoryId: categoryIdValue,
		originalName,
	});
	const isSaveDisabled =
		blockedReason !== undefined ||
		hasNoWeekdays ||
		hasNoTargetUnit ||
		isSubmitting;
	const isTargetTypeLockedToSimple = directionValue === "break";

	useEffect(() => {
		if (isTargetTypeLockedToSimple && targetTypeValue === "quantity") {
			setValue("targetType", "simple", { shouldDirty: true });
		}
	}, [isTargetTypeLockedToSimple, targetTypeValue, setValue]);

	async function onSubmit(values: HabitFormValues) {
		// The schema refuses a null category, so its output is always an id.
		const { categoryId } = values;
		const frequency = toFrequency(values);
		// Stale Amount/Unit input never leaks in if Quantity was picked, then
		// switched back to Simple check — a simple-check habit always has null.
		const targetAmount =
			values.targetType === "quantity" ? values.targetAmount : null;
		const targetUnit =
			values.targetType === "quantity" ? values.targetUnit.trim() : null;

		// This modal has no ToastHost (it sits above the Habits stack), so a
		// failed save is shown inline, above Save — the form stays as it was,
		// and a retry is one tap. `runSafely` also logs it and never rejects.
		setSubmitError(null);
		const result = await runSafely(
			{
				scope: "habit-form",
				failure: failureMessage("save", "this habit"),
				onFailure: (_error, message) => setSubmitError(message),
			},
			async () => {
				if (mode === "create") {
					await createHabit({
						name: values.name,
						categoryId,
						direction: values.direction,
						targetType: values.targetType,
						targetAmount,
						targetUnit,
						frequency,
					});
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
		if (result.ok) router.back();
	}

	// Archiving is reversible, so it's one tap with an Undo toast — the same as
	// Detail's (HAB-13/20). This modal has no ToastHost, so a failure is shown
	// inline; the toast is raised for the screen underneath, as the form closes.
	async function handleArchive() {
		if (habitId === undefined || !habit) return;
		const { name } = habit;
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
		showToast({
			message: `Archived '${name}'`,
			actionLabel: "Undo",
			onAction: () => restoreHabit(habitId),
		});
		router.back();
	}

	if (mode === "edit" && !habit) {
		return (
			<View style={[styles.loading, { backgroundColor: colors.bg }]}>
				<Text style={{ color: colors.sub }}>Loading…</Text>
			</View>
		);
	}

	return (
		// The name field autofocuses on create (HAB-22), so the keyboard is up
		// from the first frame: lift the pinned Save and its reason line above it.
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
				<Container>
					<Controller
						control={control}
						name="name"
						render={({ field, fieldState }) => (
							<TextField
								label="Name"
								placeholder={NAME_PLACEHOLDER}
								value={field.value}
								onChangeText={field.onChange}
								onBlur={field.onBlur}
								error={fieldState.error?.message}
								maxLength={MAX_HABIT_NAME_LENGTH}
								nearLimitCounter
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
						)}
					/>
				</Container>

				<CategoryPicker
					categories={categories}
					selectedId={categoryIdValue}
					onSelect={(id) => setValue("categoryId", id, { shouldDirty: true })}
					onAdd={() => setIsAddCategoryOpen(true)}
				/>

				<Container>
					<View style={styles.directionSection}>
						<ListItem
							embedded
							title="Direction"
							leading={<IconBadge symbol="arrow.left.arrow.right" />}
							trailing={
								<SegmentedControl
									label="Direction"
									size="compact"
									options={[
										{ value: "build", label: "Build" },
										{ value: "break", label: "Break" },
									]}
									value={directionValue}
									onChange={(value) =>
										setValue("direction", value, { shouldDirty: true })
									}
									disabled={mode === "edit"}
								/>
							}
						/>
						<Caption>{DIRECTION_CAPTIONS[directionValue]}</Caption>
					</View>
				</Container>

				<View
					testID="habit-form-frequency"
					onLayout={(event) => {
						if (focus !== "frequency" || hasFocused.current) return;
						hasFocused.current = true;
						scrollRef.current?.scrollTo({
							y: Math.max(0, event.nativeEvent.layout.y - 8),
							animated: false,
						});
					}}
				>
					<Container>
						<SectionLabel>Frequency</SectionLabel>
						<View style={styles.chipRow}>
							{FREQUENCY_MODES.map((frequencyMode) => (
								<Chip
									key={frequencyMode.value}
									label={frequencyMode.label}
									selected={frequencyTypeValue === frequencyMode.value}
									onPress={() =>
										setValue("frequencyType", frequencyMode.value, {
											shouldDirty: true,
										})
									}
								/>
							))}
						</View>

						{frequencyTypeValue === "weekdays" ? (
							<>
								<View style={styles.shortcutRow}>
									<Chip
										variant="outline"
										label="Weekdays shortcut"
										onPress={() =>
											setValue("weekdays", [...WEEKDAY_SHORTCUT], {
												shouldDirty: true,
											})
										}
									/>
									<Caption>pre-fills Mon–Fri</Caption>
								</View>
								<WeekdayPicker
									days={WEEKDAYS}
									selected={weekdaysValue}
									onChange={(days) =>
										setValue("weekdays", days, { shouldDirty: true })
									}
								/>
								{hasNoWeekdays ? (
									<Caption tone="error">{NO_WEEKDAYS_MESSAGE}</Caption>
								) : null}
							</>
						) : null}

						{frequencyTypeValue === "per-week" ? (
							<ListItem
								embedded
								title="Times per week"
								trailing={
									<Stepper
										value={timesPerWeekValue}
										min={MIN_TIMES_PER_WEEK}
										max={MAX_TIMES_PER_WEEK}
										accessibilityLabel="times per week"
										onChange={(value) =>
											setValue("timesPerWeek", value, { shouldDirty: true })
										}
									/>
								}
							/>
						) : null}
					</Container>
				</View>

				<Container>
					<SectionLabel>Target type</SectionLabel>
					<SegmentedControl
						label="Target"
						options={[
							{ value: "simple", label: "Simple check" },
							{ value: "quantity", label: "Quantity" },
						]}
						value={targetTypeValue}
						onChange={(value) =>
							setValue("targetType", value, { shouldDirty: true })
						}
						disabled={isTargetTypeLockedToSimple}
					/>
					{isTargetTypeLockedToSimple ? (
						<Caption>{QUANTITY_UNAVAILABLE_FOR_BREAK_CAPTION}</Caption>
					) : null}
					{targetTypeValue === "quantity" ? (
						<>
							<ListItem
								embedded
								title="Amount"
								trailing={
									<Stepper
										value={targetAmountValue}
										min={MIN_TARGET_AMOUNT}
										max={MAX_TARGET_AMOUNT}
										accessibilityLabel="target amount"
										onChange={(value) =>
											setValue("targetAmount", value, { shouldDirty: true })
										}
									/>
								}
							/>
							<Controller
								control={control}
								name="targetUnit"
								render={({ field, fieldState }) => (
									<TextField
										label="Unit"
										placeholder="glasses"
										value={field.value}
										onChangeText={field.onChange}
										onBlur={field.onBlur}
										error={fieldState.error?.message}
										maxLength={20}
										inputRef={unitRef}
										// The last field: Return puts the keyboard away.
										onSubmitEditing={() => Keyboard.dismiss()}
										// The Unit field is low on the form — bring it (and the
										// Archive card below it) clear of the keyboard.
										onFocus={() =>
											scrollRef.current?.scrollToEnd({ animated: true })
										}
									/>
								)}
							/>
						</>
					) : null}
				</Container>

				{mode === "edit" && habit?.archivedAt === null ? (
					<ActionCard
						title="Archive habit"
						subtitle="Hides it from Today and keeps every logged day. Restore it any time."
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
				{submitError ? <Banner tone="error">{submitError}</Banner> : null}
				<Button
					label="Save habit"
					onPress={handleSubmit(onSubmit)}
					disabled={isSaveDisabled}
					disabledReason={blockedReason}
					loading={isSubmitting}
				/>
			</View>

			<AddCategorySheet
				visible={isAddCategoryOpen}
				categories={categories}
				onDismiss={() => setIsAddCategoryOpen(false)}
				onCreate={createCategory}
				onCreated={(category) => {
					// F2d: back to the picker with the new chip already selected.
					setValue("categoryId", category.id, { shouldDirty: true });
					setIsAddCategoryOpen(false);
				}}
				isCreating={isCreatingCategory}
			/>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
	},
	scrollContent: {
		padding: 16,
		gap: 16,
	},
	loading: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	directionSection: {
		gap: 12,
	},
	chipRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	shortcutRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	footer: {
		gap: 8,
		paddingHorizontal: 16,
		paddingBottom: 16,
		paddingTop: 8,
	},
});
