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
			"app.config.ts",
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

		// app.config.ts only reads the flag, to refuse it in a production build.
		const setters = configs
			.filter((file) => file !== "app.config.ts")
			.filter((file) => read(file).includes(FLAG));
		expect(setters).toEqual([".github/workflows/ios-simulator.yml"]);
		expect(read("app.config.ts")).not.toMatch(
			new RegExp(`${FLAG}\\s*(=[^=]|:)`),
		);
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
				/load-device-state|dev-state-repository|device-validation\/launch-request/.test(
					read(file),
				),
			)
			.filter(
				(file) =>
					!/(load-device-state|dev-state-repository|launch-request)(\.web)?\.ts$/.test(
						file,
					),
			);
		expect(importers).toEqual([
			"src/modules/habits/screens/dev-state-screen.tsx",
		]);

		const screen = read("src/modules/habits/screens/dev-state-screen.tsx");
		expect(screen).toContain("isDeviceValidationBuild()");
		expect(screen).toMatch(/if \(!enabled\) return <Redirect href="\/" \/>/);
		expect(screen).toMatch(
			/if \(!enabled \|\| !route \|\| !deviceState\) return/,
		);
		expect(screen).toMatch(/!isDeviceValidationBuild\(\) \|\| !launchFile/);
	});

	it("the screen reaches the loader only through a require inside the inline flag check", () => {
		const screen = read("src/modules/habits/screens/dev-state-screen.tsx");
		// No static import of the loader or the launch-file reader: a static
		// import keeps them (and the fixtures behind them) in a release bundle.
		for (const module of [
			"load-device-state",
			"dev-state-repository",
			"device-state",
			"launch-request",
		]) {
			expect(screen).not.toMatch(
				new RegExp(`^\\s*import[^;]*from\\s+["'][^"']*${module}["']`, "m"),
			);
			expect(screen).not.toMatch(
				new RegExp(`^\\s*import\\s+["'][^"']*${module}["']`, "m"),
			);
		}
		// Every require of them sits in `FLAG === "1" ? require("…") : null`.
		const required = [
			...screen.matchAll(
				/require\(\s*["']([^"']*(?:load-device-state|dev-state-repository|device-state|launch-request))["']\s*\)/g,
			),
		].map((match) => match[1]);
		expect(required.sort()).toEqual([
			"../services/load-device-state",
			"@/lib/device-validation/launch-request",
		]);
		const gated = [
			...screen.matchAll(
				new RegExp(
					`process\\.env\\.${FLAG}\\s*===\\s*"1"\\s*\\?\\s*require\\(\\s*"([^"]+)"\\s*\\)\\s*:\\s*null`,
					"g",
				),
			),
		].map((match) => match[1]);
		expect(gated.sort()).toEqual(required.sort());
		// No dynamic import() either: it would be a second, ungated way in
		// (`typeof import(…)` in a type is erased and fine).
		expect(screen).not.toMatch(
			/(?<!typeof\s)\bimport\(\s*["'][^"']*(?:load-device-state|launch-request)/,
		);
	});

	it("a static import or an ungated require would be caught by the pattern", () => {
		const gate = new RegExp(
			`process\\.env\\.${FLAG}\\s*===\\s*"1"\\s*\\?\\s*require\\(\\s*"([^"]+)"\\s*\\)\\s*:\\s*null`,
			"g",
		);
		const ungated =
			'const x = isOn() ? require("../services/load-device-state") : null;';
		expect([...ungated.matchAll(gate)]).toEqual([]);
		const noFlag = `const x = process.env.${FLAG} ? require("../services/load-device-state") : null;`;
		expect([...noFlag.matchAll(gate)]).toEqual([]);
		const gated = `const x = process.env.${FLAG} === "1" ? require("../services/load-device-state") : null;`;
		expect([...gated.matchAll(gate)]).toHaveLength(1);
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

	it("the flag is read in two places, both as a literal Metro can inline", () => {
		const readers = walk("src")
			.filter((file) => /\.(ts|tsx)$/.test(file))
			.filter((file) => read(file).includes(`process.env.${FLAG}`))
			.filter((file) => !file.includes(".test."));
		expect(readers).toEqual([
			"src/lib/device-validation/enabled.ts",
			"src/modules/habits/screens/dev-state-screen.tsx",
		]);
		// In the screen every read is the `=== "1" ? require(…)` gate.
		const screen = read("src/modules/habits/screens/dev-state-screen.tsx");
		const reads = screen.match(new RegExp(`process\\.env\\.${FLAG}`, "g"));
		const gates = screen.match(
			new RegExp(
				`process\\.env\\.${FLAG}\\s*===\\s*"1"\\s*\\?\\s*require\\(`,
				"g",
			),
		);
		expect(reads).toHaveLength(2);
		expect(gates).toHaveLength(2);
	});
});
