#!/usr/bin/env node
/**
 * The device-validation plan: every state in the visual-check registry
 * (scripts/visual-check/screens.mjs) and how to reproduce it on the iOS
 * Simulator build.
 *
 *   node scripts/device-validation/plan.mjs            # prints coverage.json
 *   node scripts/device-validation/plan.mjs --list     # one line per state
 *
 * A state is
 * - `static`: the route alone (the build's `dev-state` hook loads its fixture
 *   scenario and opens the route), or
 * - `flow`: it needs taps first. The registry's Playwright `interact()` is run
 *   against a recorder that turns each locator call into a Maestro command, so
 *   the same steps drive the phone, or
 * - `unsupported`: web-only machinery (the migration screens `DatabaseProvider.web`
 *   fakes, the loading and load-failure fixtures, forced write failures) or a
 *   step Maestro cannot take (a pointer drag, a key press on an input). The
 *   reason is recorded; every run lists them.
 *
 * `caveats` name captures that will legitimately differ from the web baseline
 * (a fixed simulator size, a real permission prompt, the share sheet).
 */
import { fileURLToPath } from "node:url";
import { DEFAULT_CLOCK, SCREENS } from "../visual-check/screens.mjs";

/** `?fixtures=` values that only `DatabaseProvider.web.tsx` and the web repositories simulate. */
const WEB_ONLY_FIXTURES = {
	"migration-running": "the update screen is faked by DatabaseProvider.web.tsx",
	"migration-fails":
		"the migration failure is faked by DatabaseProvider.web.tsx",
	"migration-fails-once":
		"the migration failure is faked by DatabaseProvider.web.tsx",
	"migration-fails-first-open":
		"the open failure is faked by DatabaseProvider.web.tsx",
	"today-loading":
		"the never-resolving live query exists only in the web repositories",
	"today-load-fails":
		"the failing live query exists only in the web repositories",
};

const CAVEAT_FIXTURES = {
	"reminders-times-denied":
		"notification permission is the simulator's real one (a system prompt, not a denied banner)",
	"settings-notifications-off":
		"notification permission is the simulator's real one, not 'denied'",
	"export-fails": "export runs for real; the share sheet is the system's",
};

export class Unsupported extends Error {}

const SELECTOR_TIMEOUT = 8000;

function escapeRegex(text) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A Playwright text matcher (string, exact or not, or RegExp) as the regex Maestro takes. */
function textMatcher(value, exact) {
	if (value instanceof RegExp) {
		return value.flags.includes("i") ? `(?i)${value.source}` : value.source;
	}
	return exact ? escapeRegex(value) : `(?i).*${escapeRegex(value)}.*`;
}

/** Playwright's `page`, as a recorder of Maestro commands. */
export function recorder() {
	const commands = [];
	const notes = [];

	const make = (selector) => {
		const locator = {
			selector,
			first: () => make({ ...selector, index: 0 }),
			nth: (n) => make({ ...selector, index: n }),
			// Maestro has no "last match"; a wait on it is only a pause, a tap cannot be translated.
			last: () => {
				const pause = make({ ...selector, index: 0 });
				pause.click = async () => {
					throw new Unsupported(
						"locator.last().click(): Maestro cannot pick the last match",
					);
				};
				pause.waitFor = async () => {
					notes.push("a wait for the last match was replaced by a pause");
					commands.push({
						extendedWaitUntil: {
							visible: "__never_on_screen__",
							timeout: 800,
							optional: true,
						},
					});
				};
				return pause;
			},
			scrollIntoViewIfNeeded: async () => {
				commands.push({
					scrollUntilVisible: { element: selector, timeout: 15000 },
				});
			},
			getByText: (t, o = {}) =>
				make({ text: textMatcher(t, o.exact), childOf: selector }),
			getByLabel: (t, o = {}) =>
				make({ text: textMatcher(t, o.exact), childOf: selector }),
			getByRole: (_role, o = {}) => roleLocator(o, selector),
			getByTestId: (id) => make({ id, childOf: selector }),
			click: async () => {
				commands.push({ tapOn: selector });
			},
			fill: async (value) => {
				commands.push({ tapOn: selector });
				commands.push({ inputText: value });
			},
			waitFor: async () => {
				commands.push({
					extendedWaitUntil: {
						visible: selector,
						timeout: SELECTOR_TIMEOUT,
						optional: true,
					},
				});
			},
			press: async (key) => {
				if (key === "Enter") commands.push({ pressKey: "Enter" });
				else throw new Unsupported(`pressing ${key} in a field`);
			},
			blur: async () => {
				commands.push({ hideKeyboard: true });
			},
			boundingBox: async () => {
				throw new Unsupported("reading an element's box (pointer drag)");
			},
			evaluate: async () => {
				throw new Unsupported("locator.evaluate");
			},
		};
		return locator;
	};

	const roleLocator = (o, parent) => {
		if (o.name === undefined) {
			throw new Unsupported("getByRole without a name");
		}
		const s = { text: textMatcher(o.name, o.exact) };
		if (parent) s.childOf = parent;
		return make(s);
	};

	const page = {
		getByText: (t, o = {}) => make({ text: textMatcher(t, o.exact) }),
		getByLabel: (t, o = {}) => make({ text: textMatcher(t, o.exact) }),
		getByPlaceholder: (t, o = {}) => make({ text: textMatcher(t, o.exact) }),
		getByTestId: (id) => make({ id }),
		getByRole: (_role, o = {}) => roleLocator(o),
		waitForTimeout: async (ms) => {
			if (ms >= 300) {
				commands.push({
					extendedWaitUntil: {
						visible: "__never_on_screen__",
						timeout: Math.min(ms, 1500),
						optional: true,
					},
				});
			}
		},
		mouse: {
			move: async () => {},
			wheel: async (_dx, dy) => {
				// The web wheel is a scroll of dy px on an 852 px screen; a swipe up is the phone's.
				const swipes = dy >= 3000 ? 3 : 1;
				const travel = Math.max(10, Math.min(60, Math.round((dy / 852) * 100)));
				for (let i = 0; i < swipes; i += 1) {
					commands.push({
						swipe: {
							start: "50%, 75%",
							end: `50%, ${75 - travel}%`,
							duration: 400,
						},
					});
				}
			},
			down: async () => {
				throw new Unsupported("pointer drag (mouse.down)");
			},
			up: async () => {
				throw new Unsupported("pointer drag (mouse.up)");
			},
		},
		context: () => ({
			grantPermissions: async () => {
				notes.push("clipboard permission is not needed on iOS");
			},
		}),
		evaluate: async () => {
			notes.push("a DOM script step (scrolling or blurring) was skipped");
		},
		emulateMedia: async () => {
			notes.push(
				"reduced motion is set with the simulator's Accessibility settings, not here",
			);
		},
	};
	return { page, commands, notes };
}

/** `shard` is where a state runs: its appearance, and `ax-` for Dynamic Type. */
function shardOf(screen) {
	const ax = /[?&]textSize=ax\b/.test(screen.route);
	return `${ax ? "ax-" : ""}${screen.colorScheme ?? "light"}`;
}

export async function planState(name, screen) {
	const [, query = ""] = screen.route.split("?");
	const params = new URLSearchParams(query);
	const item = {
		name,
		feature: screen.feature,
		shard: shardOf(screen),
		route: screen.route,
		clock: screen.clock ?? DEFAULT_CLOCK,
		mockup: screen.mockup ?? null,
		status: "static",
		caveats: [],
		steps: [],
	};

	const fixture = params.get("fixtures");
	if (fixture && WEB_ONLY_FIXTURES[fixture]) {
		return {
			...item,
			status: "unsupported",
			reason: WEB_ONLY_FIXTURES[fixture],
		};
	}
	if (params.get("failWrites") === "1") {
		return {
			...item,
			status: "unsupported",
			reason: "forced write failures exist only in the web repositories",
		};
	}
	if (fixture && CAVEAT_FIXTURES[fixture])
		item.caveats.push(CAVEAT_FIXTURES[fixture]);
	if (screen.viewport) {
		item.caveats.push(
			`web viewport ${screen.viewport.width}×${screen.viewport.height}; the simulator has one fixed size and a real keyboard`,
		);
	}

	if (screen.interact) {
		const { page, commands, notes } = recorder();
		try {
			await screen.interact(page, { clock: item.clock });
		} catch (error) {
			if (error instanceof Unsupported) {
				return { ...item, status: "unsupported", reason: error.message };
			}
			return {
				...item,
				status: "unsupported",
				reason: `interact() could not be translated: ${error.message}`,
			};
		}
		item.status = "flow";
		item.steps = commands;
		item.caveats.push(...notes);
	}
	return item;
}

export async function buildPlan() {
	const plan = [];
	for (const [name, screen] of Object.entries(SCREENS)) {
		plan.push(await planState(name, screen));
	}
	return plan;
}

/** The numbers every run reports: how many states, how each is reproduced, and which cannot be. */
export function coverage(plan) {
	const by = (status) => plan.filter((item) => item.status === status);
	return {
		total: plan.length,
		static: by("static").length,
		flow: by("flow").length,
		unsupported: by("unsupported").map(({ name, reason, shard }) => ({
			name,
			shard,
			reason,
		})),
		shards: Object.fromEntries(
			["light", "dark", "ax-light", "ax-dark"].map((shard) => [
				shard,
				plan.filter((item) => item.shard === shard).length,
			]),
		),
		caveats: plan
			.filter((item) => item.caveats.length > 0)
			.map(({ name, caveats }) => ({ name, caveats })),
	};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const plan = await buildPlan();
	if (process.argv.includes("--list")) {
		for (const item of plan) {
			console.log(
				`${item.status.padEnd(11)} ${item.shard.padEnd(9)} ${item.name}${item.reason ? `  — ${item.reason}` : ""}`,
			);
		}
	} else {
		console.log(JSON.stringify(coverage(plan), null, 2));
	}
}
