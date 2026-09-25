import {
	habitFormSchema,
	NO_WEEKDAYS_MESSAGE,
	toFrequency,
	toFrequencyFormValues,
} from "./habit-form-schema";

const validInput = {
	name: "Read",
	icon: "book",
	color: "blue",
	category: "Morning",
	direction: "build",
	targetType: "simple",
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

	it("accepts a blank category (converted to null at submit time, not by the schema)", () => {
		const result = habitFormSchema.safeParse({ ...validInput, category: "" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.category).toBe("");
		}
	});

	it("trims category whitespace", () => {
		const result = habitFormSchema.safeParse({
			...validInput,
			category: "  Morning  ",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.category).toBe("Morning");
		}
	});

	it("rejects an icon outside the fixed set", () => {
		const result = habitFormSchema.safeParse({ ...validInput, icon: "rocket" });
		expect(result.success).toBe(false);
	});

	it("rejects a color outside the fixed set", () => {
		const result = habitFormSchema.safeParse({
			...validInput,
			color: "magenta",
		});
		expect(result.success).toBe(false);
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
