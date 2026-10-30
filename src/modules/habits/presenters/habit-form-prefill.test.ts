import { TEST_BUILT_IN_CATEGORIES } from "../test-support/habit-builder";
import {
	blankFormValues,
	parseHabitPrefill,
	prefillToFormValues,
} from "./habit-form-prefill";

describe("prefillToFormValues", () => {
	it("fills name, category, goal, target and frequency from a suggestion (BS2)", () => {
		const values = prefillToFormValues(
			{
				name: "Drink water",
				category: "Health",
				direction: "build",
				target: { amount: 8, unit: "glasses" },
				frequency: { type: "daily" },
			},
			TEST_BUILT_IN_CATEGORIES,
		);
		const health = TEST_BUILT_IN_CATEGORIES.find((c) => c.name === "Health");
		expect(values).toMatchObject({
			name: "Drink water",
			categoryId: health?.id,
			direction: "build",
			targetType: "quantity",
			targetAmount: 8,
			targetUnit: "glasses",
			frequencyType: "daily",
		});
	});

	it("keeps a Break suggestion a plain check, and a per-week one on its count", () => {
		const values = prefillToFormValues(
			{
				name: "No sugar",
				category: null,
				direction: "break",
				target: { amount: 3, unit: "x" },
				frequency: { type: "per-week", timesPerWeek: 5 },
			},
			TEST_BUILT_IN_CATEGORIES,
		);
		expect(values).toMatchObject({
			categoryId: null,
			targetType: "simple",
			targetUnit: "",
			frequencyType: "per-week",
			timesPerWeek: 5,
		});
	});

	it("blank is Build · Check · Daily with only the route's name", () => {
		expect(blankFormValues("Yoga")).toMatchObject({
			name: "Yoga",
			direction: "build",
			targetType: "simple",
			frequencyType: "daily",
			categoryId: null,
		});
	});
});

describe("parseHabitPrefill", () => {
	const valid = {
		name: "Drink water",
		category: "Health",
		direction: "build",
		target: { amount: 8, unit: "glasses" },
		frequency: { type: "daily" },
	};

	it("reads a complete suggestion", () => {
		expect(parseHabitPrefill(JSON.stringify(valid))).toEqual(valid);
	});

	it("ignores nothing, bad JSON, an unknown category or a half-filled suggestion", () => {
		expect(parseHabitPrefill(undefined)).toBeUndefined();
		expect(parseHabitPrefill("{nope")).toBeUndefined();
		expect(
			parseHabitPrefill(JSON.stringify({ ...valid, category: "Nope" })),
		).toBeUndefined();
		expect(
			parseHabitPrefill(JSON.stringify({ name: "Drink water" })),
		).toBeUndefined();
	});
});
