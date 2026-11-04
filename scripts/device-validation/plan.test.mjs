import assert from "node:assert/strict";
import test from "node:test";
import { SCREENS } from "../visual-check/screens.mjs";
import { buildPlan, coverage, recorder, Unsupported } from "./plan.mjs";

test("recorder turns Playwright locators into Maestro commands", async () => {
	const { page, commands } = recorder();
	await page.getByRole("button", { name: "Skip for now" }).click();
	await page.getByRole("button", { name: "Drink water", exact: true }).click();
	await page.getByLabel("Name", { exact: true }).first().fill("Run");
	await page.getByTestId("segmented-collapsed").click();
	await page.getByText("Nothing to track yet").waitFor();
	await page.mouse.wheel(0, 360);
	assert.deepEqual(commands[0], { tapOn: { text: "(?i).*Skip for now.*" } });
	assert.deepEqual(commands[1], { tapOn: { text: "Drink water" } });
	assert.deepEqual(commands[2], { tapOn: { text: "Name", index: 0 } });
	assert.deepEqual(commands[3], { inputText: "Run" });
	assert.deepEqual(commands[4], { tapOn: { id: "segmented-collapsed" } });
	assert.equal(commands[5].extendedWaitUntil.optional, true);
	assert.ok(commands[6].swipe);
});

test("regex names pass their source through and special characters are escaped", async () => {
	const { page, commands } = recorder();
	await page.getByRole("button", { name: /^July,/ }).click();
	await page.getByText("1 (2)? a.b", { exact: true }).click();
	assert.deepEqual(commands[0], { tapOn: { text: "^July," } });
	assert.deepEqual(commands[1], { tapOn: { text: "1 \\(2\\)\\? a\\.b" } });
});

test("a pointer drag cannot be translated", async () => {
	const { page } = recorder();
	await assert.rejects(page.mouse.down(), Unsupported);
	await assert.rejects(page.getByText("x").boundingBox(), Unsupported);
});

test("every registry state is planned once, in the shard its web render implies", async () => {
	const plan = await buildPlan();
	assert.equal(plan.length, Object.keys(SCREENS).length);
	assert.equal(new Set(plan.map((item) => item.name)).size, plan.length);
	for (const item of plan) {
		const dark = item.name.endsWith("-dark");
		assert.equal(item.shard.endsWith("dark"), dark, item.name);
		assert.equal(
			item.shard.startsWith("ax-"),
			/[?&]textSize=ax\b/.test(item.route),
			item.name,
		);
	}
});

test("web-only states are named, with a reason, and the rest are reproducible", async () => {
	const report = coverage(await buildPlan());
	const names = report.unsupported.map((u) => u.name);
	for (const name of [
		"migration-running",
		"today-loading",
		"today-load-error",
		"error-screen-migration-failed",
	]) {
		assert.ok(names.includes(name), name);
	}
	assert.ok(report.unsupported.every((u) => u.reason));
	assert.ok(report.static + report.flow > report.total * 0.8);
	assert.equal(
		report.static + report.flow + report.unsupported.length,
		report.total,
	);
});
