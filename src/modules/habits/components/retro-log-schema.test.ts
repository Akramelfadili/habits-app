import { MAX_NOTE_LENGTH } from "../constants";
import { retroLogFormSchema } from "./retro-log-schema";

describe("retroLogFormSchema", () => {
	it("accepts check and quantity values with an optional note", () => {
		const result = retroLogFormSchema.safeParse({
			values: { 1: 6, 2: true, 3: false },
			note: "",
		});
		expect(result.success).toBe(true);
	});

	it("accepts a note right at the cap and rejects one past it", () => {
		const atCap = "a".repeat(MAX_NOTE_LENGTH);
		expect(
			retroLogFormSchema.safeParse({ values: {}, note: atCap }).success,
		).toBe(true);
		expect(
			retroLogFormSchema.safeParse({ values: {}, note: `${atCap}a` }).success,
		).toBe(false);
	});

	it("rejects a negative or fractional quantity", () => {
		expect(
			retroLogFormSchema.safeParse({ values: { 1: -1 }, note: "" }).success,
		).toBe(false);
		expect(
			retroLogFormSchema.safeParse({ values: { 1: 1.5 }, note: "" }).success,
		).toBe(false);
	});
});
