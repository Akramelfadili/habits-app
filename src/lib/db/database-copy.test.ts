import { migrationCopy } from "@/modules/habits/messages";
import type { DatabaseCopy } from "./database-copy";

/** Every string the catalogue hands the database gate. */
function strings(copy: DatabaseCopy): string[] {
	return [
		...Object.values(copy.updating),
		copy.updateFailed.title,
		copy.updateFailed.message,
		copy.updateFailed.reason.title,
		copy.updateFailed.reason.message,
		copy.openFailed.title,
		copy.openFailed.message,
	];
}

describe("the database gate's copy (SY3, SY4)", () => {
	it("has every line filled in", () => {
		for (const line of strings(migrationCopy)) {
			expect(line.trim().length).toBeGreaterThan(0);
		}
	});

	it("promises only what the migrator keeps: one transaction, no steps, no counts", () => {
		const all = strings(migrationCopy).join(" ");
		expect(all).not.toMatch(/step \d/i);
		expect(all).not.toMatch(/\d+%/);
		expect(all).not.toMatch(/backup/i);
		// "Nothing was changed" and "as they were" are the rollback promise.
		expect(migrationCopy.updateFailed.reason.message).toMatch(
			/Nothing was changed/,
		);
		expect(migrationCopy.updateFailed.message).toMatch(/as they were/);
	});

	it("never blames the person or shows raw error text", () => {
		const all = strings(migrationCopy).join(" ");
		expect(all).not.toMatch(/SQLITE|exception|stack/i);
		expect(all).not.toMatch(/\b(oops|success)\b/i);
	});
});
