import { SUGGESTIONS, type Suggestion } from "../suggestions";
import {
	makeHabit,
	TEST_BUILT_IN_CATEGORIES,
} from "../test-support/habit-builder";
import { parseHabitPrefill, prefillToFormValues } from "./habit-form-prefill";
import { habitFormSchema, toFrequency } from "./habit-form-schema";
import {
	groupSuggestions,
	suggestionSubtitle,
	suggestionToPrefill,
} from "./suggestions-presenter";

const byName = (name: string): Suggestion => {
	const found = SUGGESTIONS.find((s) => s.name === name);
	if (!found) throw new Error(`no suggestion ${name}`);
	return found;
};

describe("suggestionSubtitle (BS1's second lines)", () => {
	it.each([
		["Drink water", "Quantity · 8 glasses a day"],
		["Cold shower", "3× per week"],
		["Meditate", "Daily"],
		["Journal 5 min", "Daily"],
		["Morning run", "Mon, Wed, Fri"],
		["Upper body", "Tue, Thu"],
		["Read 20 min", "Daily"],
		["No social media", "Break · daily"],
		["No phone in bed", "Break · daily"],
	])("%s reads %s", (name, subtitle) => {
		expect(suggestionSubtitle(byName(name))).toBe(subtitle);
	});

	it("names a Break habit's own schedule when it is not daily", () => {
		const weekend: Suggestion = {
			...byName("No social media"),
			frequency: { type: "weekdays", days: [6, 7] },
		};
		expect(suggestionSubtitle(weekend)).toBe("Break · sat, sun");
	});
});

describe("groupSuggestions (BS1's sections)", () => {
	it("is Health, Mindfulness, Fitness, Learning, then the Break habits together", () => {
		const sections = groupSuggestions([]);
		expect(sections.map((s) => s.title)).toEqual([
			"Health",
			"Mindfulness",
			"Fitness",
			"Learning",
			"Break a habit",
		]);
		expect(sections.map((s) => s.items.map((i) => i.suggestion.name))).toEqual([
			["Drink water", "Cold shower"],
			["Meditate", "Journal 5 min"],
			["Morning run", "Upper body"],
			["Read 20 min"],
			["No social media", "No phone in bed"],
		]);
	});

	it("lists every suggestion exactly once", () => {
		const names = groupSuggestions([]).flatMap((s) =>
			s.items.map((i) => i.suggestion.id),
		);
		expect(names.sort()).toEqual(SUGGESTIONS.map((s) => s.id).sort());
	});

	it("marks nothing Added with no habits", () => {
		const items = groupSuggestions([]).flatMap((s) => s.items);
		expect(items.every((item) => !item.added)).toBe(true);
	});

	it("marks a suggestion Added by name, ignoring case and surrounding spaces", () => {
		const items = groupSuggestions([
			makeHabit({ id: 1, name: "  DRINK water " }),
		]).flatMap((s) => s.items);
		expect(items.filter((i) => i.added).map((i) => i.suggestion.name)).toEqual([
			"Drink water",
		]);
	});

	it("counts an archived habit as Added: restoring it is the way back, not a duplicate", () => {
		const items = groupSuggestions([
			makeHabit({
				id: 1,
				name: "Meditate",
				archivedAt: new Date("2026-09-01"),
			}),
		]).flatMap((s) => s.items);
		expect(items.find((i) => i.suggestion.name === "Meditate")?.added).toBe(
			true,
		);
	});

	it("does not mark a similar but different name", () => {
		const items = groupSuggestions([
			makeHabit({ id: 1, name: "Drink water daily" }),
		]).flatMap((s) => s.items);
		expect(items.some((i) => i.added)).toBe(false);
	});

	it("gives each row its category's look", () => {
		const health = groupSuggestions([])[0].items[0];
		expect(health.appearance).toEqual({ shape: "plus", hue: 175 });
	});
});

describe("suggestionToPrefill: every suggestion opens a form that can be saved as it is (BS2)", () => {
	it.each(SUGGESTIONS.map((s) => [s.name, s] as const))(
		"%s passes the form's schema with no edits",
		(_name, suggestion) => {
			const values = prefillToFormValues(
				suggestionToPrefill(suggestion),
				TEST_BUILT_IN_CATEGORIES,
			);
			const parsed = habitFormSchema.safeParse(values);
			expect(parsed.success).toBe(true);
		},
	);

	it.each(SUGGESTIONS.map((s) => [s.name, s] as const))(
		"%s survives the route param round trip",
		(_name, suggestion) => {
			const prefill = suggestionToPrefill(suggestion);
			expect(parseHabitPrefill(JSON.stringify(prefill))).toEqual(prefill);
		},
	);

	it.each(SUGGESTIONS.map((s) => [s.name, s] as const))(
		"%s fills name, category, goal, target and frequency exactly",
		(_name, suggestion) => {
			const values = prefillToFormValues(
				suggestionToPrefill(suggestion),
				TEST_BUILT_IN_CATEGORIES,
			);
			const category = TEST_BUILT_IN_CATEGORIES.find(
				(c) => c.name === suggestion.category,
			);
			expect(values.name).toBe(suggestion.name);
			expect(values.categoryId).toBe(category?.id);
			expect(values.direction).toBe(suggestion.direction);
			expect(values.targetType).toBe(suggestion.target ? "quantity" : "simple");
			if (suggestion.target) {
				expect(values.targetAmount).toBe(suggestion.target.amount);
				expect(values.targetUnit).toBe(suggestion.target.unit);
			}
			const parsed = habitFormSchema.parse(values);
			expect(toFrequency(parsed)).toEqual(suggestion.frequency);
		},
	);
});
