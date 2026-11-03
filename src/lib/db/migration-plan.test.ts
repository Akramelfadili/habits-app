import { planMigrations } from "./migration-plan";

const reader = (row: { created_at: number | string } | null | "throws") => ({
	getFirstSync: <Row>(): Row | null => {
		if (row === "throws")
			throw new Error("no such table: __drizzle_migrations");
		return row as Row | null;
	},
});

describe("planMigrations", () => {
	it("is fresh when the migrations table does not exist yet", () => {
		expect(planMigrations(reader("throws"), 500)).toBe("fresh");
	});

	it("is fresh when the table is empty", () => {
		expect(planMigrations(reader(null), 500)).toBe("fresh");
	});

	it("is an upgrade when the last applied migration is older than the newest one shipped", () => {
		expect(planMigrations(reader({ created_at: 400 }), 500)).toBe("upgrade");
	});

	it("is current when the newest migration is already applied", () => {
		expect(planMigrations(reader({ created_at: 500 }), 500)).toBe("current");
	});

	it("reads created_at the way the migrator does: it can come back as text", () => {
		expect(planMigrations(reader({ created_at: "400" }), 500)).toBe("upgrade");
		expect(planMigrations(reader({ created_at: "500" }), 500)).toBe("current");
	});
});
