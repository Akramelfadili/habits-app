// Tests for scripts/check-repo-hygiene.mjs, on synthetic file lists and strings
// (no real forbidden files are created). Secret-shaped strings are assembled at
// runtime so this file does not trip the guard itself.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	checkContent,
	checkPaths,
	checkSizes,
	MAX_BYTES,
} from "./check-repo-hygiene.mjs";

describe("check-repo-hygiene paths", () => {
	it("accepts ordinary tracked files", () => {
		assert.deepEqual(
			checkPaths([
				"src/app/index.tsx",
				".env.example",
				".vscode/settings.json",
				".vscode/extensions.json",
				"docs/mockups/v3/renders/INDEX.md",
				"assets/images/icon.png",
				"package-lock.json",
				"src/modules/habits/build-streak.ts",
			]),
			[],
		);
	});

	it("rejects each forbidden class", () => {
		const bad = [
			".env",
			".env.local",
			"config/.env.production",
			"certs/dev.pem",
			"AuthKey.p8",
			"sign.p12",
			"id.key",
			"app.mobileprovision",
			"release.keystore",
			"upload.jks",
			"ios/Podfile",
			"android/build.gradle",
			"node_modules/x/index.js",
			"google-services.json",
			"app/GoogleService-Info.plist",
			"service-account-prod.json",
			"debug.log",
			"npm-debug.log.1",
			".DS_Store",
			"sub/Thumbs.db",
			".idea/workspace.xml",
			"file.swp",
			".vscode/launch.json",
			"export.zip",
			"a.tar.gz",
			"x.tgz",
			".expo/types/router.d.ts",
			"dist/main.js",
			"coverage/lcov.info",
			"tmp/x.ts",
			"tsconfig.tsbuildinfo",
			"expo-env.d.ts",
			"notes.bak",
			"docs/mockups/v3/renders/today/slice_00.png",
		];
		for (const f of bad) {
			assert.equal(checkPaths([f]).length, 1, `${f} should be rejected`);
		}
	});
});

describe("check-repo-hygiene sizes", () => {
	it("allows small files and allowlisted big ones", () => {
		assert.deepEqual(
			checkSizes([
				{ path: "src/a.ts", size: 10 },
				{ path: "src/b.ts", size: MAX_BYTES },
				{ path: "docs/visual-baseline/today.png", size: 5 * MAX_BYTES },
				{ path: "docs/mockups/v3/Habits V3.dc.html", size: 5 * MAX_BYTES },
				{ path: "docs/mockups/v3/support.js", size: 5 * MAX_BYTES },
				{ path: "assets/images/icon.png", size: 5 * MAX_BYTES },
				{ path: "package-lock.json", size: 5 * MAX_BYTES },
			]),
			[],
		);
	});

	it("rejects a big file outside the allowlist", () => {
		const problems = checkSizes([
			{ path: "src/big.json", size: MAX_BYTES + 1 },
			{ path: "docs/mockups/v3/other/x.dc.html", size: 5 * MAX_BYTES },
		]);
		assert.equal(problems.length, 2);
	});
});

describe("check-repo-hygiene content", () => {
	it("accepts ordinary text", () => {
		assert.deepEqual(
			checkContent("a.ts", 'const password = getPassword();\nconst k = "abc";'),
			[],
		);
	});

	it("rejects secret shapes", () => {
		const cases = [
			`-----BEGIN ${"RSA "}PRIVATE KEY-----\nabc`,
			`${"-----BEGIN "}${"PRIVATE KEY-----"}`,
			`key: ${"AKIA"}${"IOSFODNN7EXAMPLE"}`,
			`k=${"AIza"}${"x".repeat(35)}`,
			`t=${"ghp_"}${"a".repeat(36)}`,
			`t=${"github_pat_"}${"a".repeat(30)}`,
			`${"pass"}${"word"} = "hunter2hunter2"`,
			`${"pass"}${"word"}: 'hunter2'`,
		];
		for (const text of cases) {
			assert.equal(checkContent("x.txt", text).length >= 1, true, text);
		}
	});

	it("skips binary files", () => {
		assert.deepEqual(
			checkContent("a.png", `-----BEGIN ${"RSA "}PRIVATE KEY-----`),
			[],
		);
		assert.deepEqual(
			checkContent("a.dat", `\0${"-----BEGIN "}${"PRIVATE KEY-----"}`),
			[],
		);
	});
});
