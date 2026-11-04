import fs from "node:fs";
import path from "node:path";

/**
 * Keeps the device-validation hook (`habitsapp://dev-state`, docs/decisions/
 * 007-device-validation.md) out of production. The hook is switched on only by
 * `EXPO_PUBLIC_DEVICE_VALIDATION=1` at bundle time; this test fails if that
 * variable can reach any build config but the manual simulator workflow, or if
 * the code behind the switch can be reached without asking it.
 */
const ROOT = path.resolve(__dirname, "../../..");
const FLAG = "EXPO_PUBLIC_DEVICE_VALIDATION";

function read(file: string): string {
	return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function walk(dir: string, found: string[] = []): string[] {
	for (const entry of fs.readdirSync(path.join(ROOT, dir), {
		withFileTypes: true,
	})) {
		const relative = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(relative, found);
		else found.push(relative);
	}
	return found;
}

describe("device validation stays out of production", () => {
	const original = process.env[FLAG];
	afterEach(() => {
		if (original === undefined) delete process.env[FLAG];
		else process.env[FLAG] = original;
	});

	it("is off unless the build sets the flag to exactly 1", () => {
		const { isDeviceValidationBuild } = require("./enabled");
		delete process.env[FLAG];
		expect(isDeviceValidationBuild()).toBe(false);
		for (const value of ["", "0", "true", "yes", "2"]) {
			process.env[FLAG] = value;
			expect(isDeviceValidationBuild()).toBe(false);
		}
		process.env[FLAG] = "1";
		expect(isDeviceValidationBuild()).toBe(true);
	});

	it("is set by no build config except the manual simulator workflow", () => {
		const configs = [
			"app.json",
			"package.json",
			"babel.config.js",
			"metro.config.js",
			"Makefile",
			"eas.json",
			".env",
			".env.production",
			".env.local",
			...fs
				.readdirSync(path.join(ROOT, ".github/workflows"))
				.map((file) => `.github/workflows/${file}`),
		].filter((file) => fs.existsSync(path.join(ROOT, file)));

		const setters = configs.filter((file) => read(file).includes(FLAG));
		expect(setters).toEqual([".github/workflows/ios-simulator.yml"]);
	});

	it("the simulator workflow is manual-only", () => {
		const workflow = read(".github/workflows/ios-simulator.yml");
		const triggers = workflow.slice(
			workflow.indexOf("\non:"),
			workflow.indexOf("\njobs:"),
		);
		expect(triggers).toContain("workflow_dispatch");
		expect(triggers).not.toMatch(/^\s+(push|pull_request|schedule):/m);
	});

	it("only the dev-state screen reaches the state loader, and it asks the flag first", () => {
		const importers = walk("src")
			.filter((file) => /\.(ts|tsx)$/.test(file) && !file.includes(".test."))
			.filter((file) =>
				/load-device-state|dev-state-repository/.test(read(file)),
			)
			.filter(
				(file) =>
					!/(load-device-state|dev-state-repository)(\.web)?\.ts$/.test(file),
			);
		expect(importers).toEqual([
			"src/modules/habits/screens/dev-state-screen.tsx",
		]);

		const screen = read("src/modules/habits/screens/dev-state-screen.tsx");
		expect(screen).toContain("isDeviceValidationBuild()");
		expect(screen).toMatch(/if \(!enabled\) return <Redirect href="\/" \/>/);
		expect(screen).toMatch(/if \(!enabled \|\| !route\) return/);
	});

	it("the only route is a thin render of that screen", () => {
		const routes = walk("src/app").filter((file) =>
			read(file).includes("dev-state"),
		);
		expect(routes.sort()).toEqual([
			"src/app/_layout.tsx",
			"src/app/dev-state.tsx",
		]);
	});

	it("the flag is read in one place, as a literal Metro can inline", () => {
		const readers = walk("src")
			.filter((file) => /\.(ts|tsx)$/.test(file))
			.filter((file) => read(file).includes(`process.env.${FLAG}`))
			.filter((file) => !file.includes(".test."));
		expect(readers).toEqual(["src/lib/device-validation/enabled.ts"]);
	});
});
