import {
	habitFormSchema,
	NO_CATEGORY_MESSAGE,
	NO_TARGET_UNIT_MESSAGE,
	NO_WEEKDAYS_MESSAGE,
	toFrequency,
	toFrequencyFormValues,
} from "./habit-form-schema";

const validInput = {
	name: "Read",
	categoryId: 5,
	direction: "build",
	targetType: "simple",
	targetAmount: 8,
	targetUnit: "",
	frequencyType: "daily",
	weekdays: [],
	timesPerWeek: 3,
};

describe("habitFormSchema", () => {
	it("accepts a fully valid habit", () => {
		const result = habitFormSchema.safeParse(validInput);
		expect(result.success).toBe(true);
	});

	it("rejects an empty name with the spec's exact message", () => {
		const result = habitFormSchema.safeParse({ ...validInput, name: "" });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe("Give this habit a name.");
		}
	});

	it("rejects a name over 40 characters", () => {
		const result = habitFormSchema.safeParse({
			...validInput,
			name: "a".repeat(41),
		});
		expect(result.success).toBe(false);
	});

	it("trims leading/trailing whitespace from the name silently", () => {
		const result = habitFormSchema.safeParse({
			...validInput,
			name: "  Read  ",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.name).toBe("Read");
		}
	});

	it("allows emoji and special characters in the name, unfiltered", () => {
		const result = habitFormSchema.safeParse({
			...validInput,
			name: "🔥 Gym!!",
		});
		expect(result.success).toBe(true);
	});

	it("blocks a habit with no category picked (HAB-24)", () => {
		const result = habitFormSchema.safeParse({
			...validInput,
			categoryId: null,
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]).toMatchObject({
				path: ["categoryId"],
				message: NO_CATEGORY_MESSAGE,
			});
		}
	});

	it("rejects Specific weekdays with no days picked", () => {
		const result = habitFormSchema.safeParse({
			...validInput,
			frequencyType: "weekdays",
			weekdays: [],
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]).toMatchObject({
				path: ["weekdays"],
				message: NO_WEEKDAYS_MESSAGE,
			});
		}
	});

	it("allows an empty day list when another mode is active", () => {
		const result = habitFormSchema.safeParse({
			...validInput,
			frequencyType: "per-week",
			weekdays: [],
		});
		expect(result.success).toBe(true);
	});

	it.each([0, 8])("rejects %i times per week", (timesPerWeek) => {
		const result = habitFormSchema.safeParse({
			...validInput,
			frequencyType: "per-week",
			timesPerWeek,
		});
		expect(result.success).toBe(false);
	});

	it("allows a blank unit when Target type is Simple check", () => {
		const result = habitFormSchema.safeParse({
			...validInput,
			targetType: "simple",
			targetUnit: "",
		});
		expect(result.success).toBe(true);
	});

	it("rejects a blank unit when Target type is Quantity", () => {
		const result = habitFormSchema.safeParse({
			...validInput,
			targetType: "quantity",
			targetUnit: "",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]).toMatchObject({
				path: ["targetUnit"],
				message: NO_TARGET_UNIT_MESSAGE,
			});
		}
	});

	it("accepts a Quantity habit with a target amount and unit", () => {
		const result = habitFormSchema.safeParse({
			...validInput,
			targetType: "quantity",
			targetAmount: 8,
			targetUnit: "glasses",
		});
		expect(result.success).toBe(true);
	});

	it.each([0, 1000])("rejects a target amount of %i", (targetAmount) => {
		const result = habitFormSchema.safeParse({
			...validInput,
			targetType: "quantity",
			targetAmount,
			targetUnit: "glasses",
		});
		expect(result.success).toBe(false);
	});
});

describe("frequency form mapping", () => {
	it("saves only the active mode's value", () => {
		expect(
			toFrequency({
				frequencyType: "per-week",
				weekdays: [1, 2],
				timesPerWeek: 4,
			}),
		).toEqual({ type: "per-week", timesPerWeek: 4 });
		expect(
			toFrequency({ frequencyType: "daily", weekdays: [1], timesPerWeek: 4 }),
		).toEqual({ type: "daily" });
	});

	it("sorts picked weekdays Mon→Sun", () => {
		expect(
			toFrequency({
				frequencyType: "weekdays",
				weekdays: [5, 1, 3],
				timesPerWeek: 3,
			}),
		).toEqual({ type: "weekdays", days: [1, 3, 5] });
	});

	it("pre-fills form fields from a saved frequency, defaulting the rest", () => {
		expect(
			toFrequencyFormValues({ type: "weekdays", days: [1, 3, 5] }),
		).toEqual({
			frequencyType: "weekdays",
			weekdays: [1, 3, 5],
			timesPerWeek: 3,
		});
		expect(
			toFrequencyFormValues({ type: "per-week", timesPerWeek: 6 }),
		).toEqual({ frequencyType: "per-week", weekdays: [], timesPerWeek: 6 });
	});
});
