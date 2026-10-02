/// <reference types="node" />
import fs from "node:fs";
import path from "node:path";

/**
 * Regression guard for the iOS 26 Liquid Glass header-button bug: header
 * buttons must come from `header-buttons.tsx`, which marks every item
 * `hidesSharedBackground`. Setting any of these options anywhere else —
 * a screen's <Stack.Screen options>, a layout's screenOptions,
 * navigation.setOptions — would bring the glass capsule (or the system back
 * button) back. Comments count too: keep the option names out of other files.
 */
const HEADER_BUTTON_OPTIONS = [
	"headerLeft",
	"headerRight",
	"headerBackTitle",
	"headerBackVisible",
	"headerBackButtonDisplayMode",
	"headerBackButtonMenuEnabled",
	"headerBackImageSource",
	"headerBackIcon",
	"unstable_headerLeftItems",
	"unstable_headerRightItems",
];
const FORBIDDEN = new RegExp(`\\b(${HEADER_BUTTON_OPTIONS.join("|")})\\b`);

const SRC = path.join(__dirname, "../../..");
const ALLOWED = new Set([path.join(__dirname, "header-buttons.tsx")]);

function sourceFiles(dir: string): string[] {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) return sourceFiles(full);
		return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
			? [full]
			: [];
	});
}

describe("header buttons guard", () => {
	it("matches the options it's meant to catch", () => {
		expect(FORBIDDEN.test("options={{ headerRight: () => <Button /> }}")).toBe(
			true,
		);
		expect(FORBIDDEN.test("headerBackTitle: habit.name")).toBe(true);
		expect(FORBIDDEN.test("headerTintColor: colors.ink")).toBe(false);
	});

	it("scans the whole app source", () => {
		const files = sourceFiles(SRC);
		expect(files.some((file) => file.endsWith("_layout.tsx"))).toBe(true);
		expect(files.some((file) => file.endsWith("habit-detail-screen.tsx"))).toBe(
			true,
		);
	});

	it("no file outside header-buttons.tsx sets a header button option", () => {
		const offenders = sourceFiles(SRC)
			.filter((file) => !ALLOWED.has(file))
			.flatMap((file) =>
				fs
					.readFileSync(file, "utf8")
					.split("\n")
					.flatMap((line, index) =>
						FORBIDDEN.test(line)
							? [`${path.relative(SRC, file)}:${index + 1}: ${line.trim()}`]
							: [],
					),
			);
		expect(offenders).toEqual([]);
	});
});
