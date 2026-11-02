import { formCopy } from "../messages";
import {
	habitFormSchema,
	makeHabitFormSchema,
	toFrequency,
	toFrequencyFormValues,
} from "./habit-form-schema";

const NAME_TOO_LONG_MESSAGE = formCopy.name.tooLong(32);
const NO_WEEKDAYS_MESSAGE = formCopy.frequency.noDays;
const NO_TARGET_UNIT_MESSAGE = formCopy.goal.unitMissing;

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

	it("rejects an empty name ", () => {
		const result = habitFormSchema.safeParse({ ...validInput, name: "" });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe(formCopy.save.needsName);
		}
	});

	it("rejects a name over 32 characters on create (HAB-22)", () => {
		const result = habitFormSchema.safeParse({
			...validInput,
			name: "a".repeat(33),
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe(NAME_TOO_LONG_MESSAGE);
		}
	});

	it("accepts exactly 32 characters on create", () => {
		const result = habitFormSchema.safeParse({
			...validInput,
			name: "a".repeat(32),
		});
		expect(result.success).toBe(true);
	});

	it("counts the cap after trimming surrounding whitespace", () => {
		const result = habitFormSchema.safeParse({
			...validInput,
			name: `  ${"a".repeat(32)}  `,
		});
		expect(result.success).toBe(true);
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

	it("accepts no category: the habit goes to Other (HAB-41)", () => {
		const result = habitFormSchema.safeParse({
			...validInput,
			categoryId: null,
		});
		expect(result.success).toBe(true);
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

describe("makeHabitFormSchema — legacy V1 names on edit (HAB-22)", () => {
	const legacyName = "Read twenty pages before a morning tea"; // 38
	const editSchema = makeHabitFormSchema(legacyName);

	it("keeps an unchanged 38-character name valid", () => {
		expect(legacyName).toHaveLength(38);
		const result = editSchema.safeParse({ ...validInput, name: legacyName });
		expect(result.success).toBe(true);
	});

	it("rejects the name once edited to 35 characters", () => {
		const result = editSchema.safeParse({
			...validInput,
			name: legacyName.slice(0, 35),
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe(NAME_TOO_LONG_MESSAGE);
		}
	});

	it("accepts the name once edited down to 32 characters", () => {
		const result = editSchema.safeParse({
			...validInput,
			name: legacyName.slice(0, 32),
		});
		expect(result.success).toBe(true);
	});

	it("treats only surrounding whitespace as unchanged", () => {
		const result = editSchema.safeParse({
			...validInput,
			name: ` ${legacyName} `,
		});
		expect(result.success).toBe(true);
	});

	it("still caps a name that was already within the limit", () => {
		const result = makeHabitFormSchema("Gym").safeParse({
			...validInput,
			name: "a".repeat(33),
		});
		expect(result.success).toBe(false);
	});
});
