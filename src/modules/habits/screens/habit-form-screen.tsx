import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { ListItem } from "@/components/ui/composite/list-item";
import { Sheet } from "@/components/ui/composite/sheet";
import { WeekdayPicker } from "@/components/ui/composite/weekday-picker";
import { Button } from "@/components/ui/primitives/button";
import { Caption } from "@/components/ui/primitives/caption";
import { Chip } from "@/components/ui/primitives/chip";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { IconSquare } from "@/components/ui/primitives/icon-square";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { SegmentedControl } from "@/components/ui/primitives/segmented-control";
import { Stepper } from "@/components/ui/primitives/stepper";
import { TextField } from "@/components/ui/primitives/text-field";
import { habitAccentInk, habitAccentTint } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import {
	DEFAULT_HABIT_ICON,
	DIRECTION_CAPTIONS,
	HABIT_COLORS,
	HABIT_ICONS,
	MAX_TIMES_PER_WEEK,
	MIN_TIMES_PER_WEEK,
	NO_CATEGORY_LABEL,
	QUANTITY_UNAVAILABLE_FOR_BREAK_CAPTION,
	WEEKDAY_SHORTCUT,
	WEEKDAYS,
} from "../constants";
import { useHabitActions } from "../hooks/use-habit-actions";
import { useHabitQueries } from "../hooks/use-habit-queries";
import type { FrequencyType } from "../types";
import {
	filterCategorySuggestions,
	pickDefaultColor,
} from "./habit-form-helpers";
import {
	DEFAULT_FREQUENCY_FORM_VALUES,
	type HabitFormValues,
	habitFormSchema,
	NO_WEEKDAYS_MESSAGE,
	toFrequency,
	toFrequencyFormValues,
} from "./habit-form-schema";

const FREQUENCY_MODES: { value: FrequencyType; label: string }[] = [
	{ value: "daily", label: "Daily" },
	{ value: "weekdays", label: "Specific weekdays" },
	{ value: "per-week", label: "X per week" },
];

type HabitFormScreenProps = {
	/** Present in edit mode; absent when creating a new habit. */
	habitId?: number;
};

export function HabitFormScreen({ habitId }: HabitFormScreenProps) {
	const router = useRouter();
	const { colors, scheme } = useTheme();
	const { habits, categories, getHabitById } = useHabitQueries();
	const { createHabit, updateHabit, isCreating, isUpdating } =
		useHabitActions();

	const mode = habitId === undefined ? "create" : "edit";
	const habit = habitId === undefined ? undefined : getHabitById(habitId);
	const hasLoadedEditValues = useRef(false);
	const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);

	const defaultColor = useMemo(() => pickDefaultColor(habits), [habits]);

	const {
		control,
		handleSubmit,
		watch,
		setValue,
		reset,
		formState: { dirtyFields },
	} = useForm<HabitFormValues>({
		resolver: zodResolver(habitFormSchema),
		mode: "onBlur",
		defaultValues: {
			name: "",
			icon: DEFAULT_HABIT_ICON,
			color: defaultColor,
			category: "",
			direction: "build",
			targetType: "simple",
			...DEFAULT_FREQUENCY_FORM_VALUES,
		},
	});

	useEffect(() => {
		if (mode === "create" && !dirtyFields.color) {
			setValue("color", defaultColor);
		}
	}, [mode, defaultColor, dirtyFields.color, setValue]);

	useEffect(() => {
		if (mode === "edit" && habit && !hasLoadedEditValues.current) {
			reset({
				name: habit.name,
				icon: habit.icon,
				color: habit.color,
				category: habit.category ?? "",
				direction: habit.direction,
				targetType: habit.targetType,
				...toFrequencyFormValues(habit.frequency),
			});
			hasLoadedEditValues.current = true;
		}
	}, [mode, habit, reset]);

	const nameValue = watch("name");
	const iconValue = watch("icon");
	const colorValue = watch("color");
	const categoryValue = watch("category");
	const directionValue = watch("direction");
	const targetTypeValue = watch("targetType");
	const frequencyTypeValue = watch("frequencyType");
	const weekdaysValue = watch("weekdays");
	const timesPerWeekValue = watch("timesPerWeek");

	const hasNoWeekdays =
		frequencyTypeValue === "weekdays" && weekdaysValue.length === 0;
	const isSubmitting = isCreating || isUpdating;
	const isSaveDisabled =
		nameValue.trim().length === 0 || hasNoWeekdays || isSubmitting;
	const isTargetTypeLockedToSimple = directionValue === "break";

	useEffect(() => {
		if (isTargetTypeLockedToSimple && targetTypeValue === "quantity") {
			setValue("targetType", "simple", { shouldDirty: true });
		}
	}, [isTargetTypeLockedToSimple, targetTypeValue, setValue]);

	const categorySuggestions = isCategorySheetOpen
		? filterCategorySuggestions(categories, categoryValue)
		: [];

	async function onSubmit(values: HabitFormValues) {
		const category =
			values.category.trim() === "" ? null : values.category.trim();
		const frequency = toFrequency(values);

		if (mode === "create") {
			await createHabit({
				name: values.name,
				icon: values.icon,
				color: values.color,
				category,
				direction: values.direction,
				targetType: values.targetType,
				frequency,
			});
		} else if (habitId !== undefined) {
			await updateHabit(habitId, {
				name: values.name,
				icon: values.icon,
				color: values.color,
				category,
				targetType: values.targetType,
				frequency,
			});
		}

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
		<View style={[styles.screen, { backgroundColor: colors.bg }]}>
			<ScrollView contentContainerStyle={styles.scrollContent}>
				<Container>
					<Controller
						control={control}
						name="name"
						render={({ field, fieldState }) => (
							<TextField
								label="Name"
								value={field.value}
								onChangeText={field.onChange}
								onBlur={field.onBlur}
								error={fieldState.error?.message}
								maxLength={40}
							/>
						)}
					/>
				</Container>

				<Container>
					<SectionLabel>Icon & color</SectionLabel>
					<View style={styles.iconGrid}>
						{HABIT_ICONS.map((entry) => (
							<IconSquare
								key={entry.key}
								variant="icon"
								symbol={entry.symbol}
								accent={{
									tint: habitAccentTint(colorValue, scheme),
									ink: habitAccentInk(colorValue, scheme),
								}}
								selected={iconValue === entry.key}
								accessibilityLabel={entry.key}
								onPress={() =>
									setValue("icon", entry.key, { shouldDirty: true })
								}
							/>
						))}
					</View>

					<View style={styles.iconGrid}>
						{HABIT_COLORS.map((key) => (
							<IconSquare
								key={key}
								variant="color"
								color={habitAccentInk(key, scheme)}
								selected={colorValue === key}
								accessibilityLabel={key}
								onPress={() => setValue("color", key, { shouldDirty: true })}
							/>
						))}
					</View>
				</Container>

				<Container dividers>
					<ListItem
						embedded
						title="Category"
						leading={<IconBadge symbol="tag" />}
						value={
							categoryValue.trim() === "" ? NO_CATEGORY_LABEL : categoryValue
						}
						navigable
						onPress={() => setIsCategorySheetOpen(true)}
					/>

					<View style={styles.directionSection}>
						<ListItem
							embedded
							title="Direction"
							leading={<IconBadge symbol="arrow.left.arrow.right" />}
							trailing={
								<SegmentedControl
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

				<Container>
					<SectionLabel>Target type</SectionLabel>
					<SegmentedControl
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
				</Container>
			</ScrollView>

			<View style={styles.footer}>
				<Button
					label="Save habit"
					onPress={handleSubmit(onSubmit)}
					disabled={isSaveDisabled}
					loading={isSubmitting}
				/>
			</View>

			<Sheet
				visible={isCategorySheetOpen}
				onDismiss={() => setIsCategorySheetOpen(false)}
			>
				<Controller
					control={control}
					name="category"
					render={({ field, fieldState }) => (
						<TextField
							label="Category"
							placeholder={NO_CATEGORY_LABEL}
							value={field.value}
							onChangeText={field.onChange}
							onBlur={field.onBlur}
							error={fieldState.error?.message}
							maxLength={40}
							autoFocus
						/>
					)}
				/>
				{categorySuggestions.length > 0 ? (
					<Container variant="inset">
						{categorySuggestions.map((suggestion) => (
							<ListItem
								key={suggestion}
								title={suggestion}
								onPress={() => {
									setValue("category", suggestion, { shouldDirty: true });
									setIsCategorySheetOpen(false);
								}}
							/>
						))}
					</Container>
				) : null}
				<Button label="Done" onPress={() => setIsCategorySheetOpen(false)} />
			</Sheet>
		</View>
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
	iconGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 10,
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
		paddingHorizontal: 16,
		paddingBottom: 16,
		paddingTop: 8,
	},
});
