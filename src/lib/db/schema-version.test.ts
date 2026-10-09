import journal from "./migrations/meta/_journal.json";
import { SCHEMA_VERSION } from "./schema-version";

describe("SCHEMA_VERSION", () => {
	it("is the number of migrations in the journal", () => {
		expect(SCHEMA_VERSION).toBe(journal.entries.length);
		expect(SCHEMA_VERSION).toBeGreaterThan(0);
	});
});
