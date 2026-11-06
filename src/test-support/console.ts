// Console guard for Jest. `installConsoleGuard()` (called once from
// jest.setup-after-env.js) swaps console.error / console.warn for a recorder
// around every test and fails the test when something unexpected was logged.
// A test that expects a message says so with `expectConsole`, which also
// returns a mock to assert on.

type Method = "error" | "warn";
type Matcher = string | RegExp;

type Allowed = { method: Method; match?: Matcher; mock: jest.Mock };

const METHODS: Method[] = ["error", "warn"];

let allowed: Allowed[] = [];
let unexpected: string[] = [];

function text(args: unknown[]): string {
	return args
		.map((arg) =>
			arg instanceof Error ? `${arg.name}: ${arg.message}` : String(arg),
		)
		.join(" ");
}

function matches(match: Matcher | undefined, message: string): boolean {
	if (match === undefined) return true;
	return typeof match === "string"
		? message.includes(match)
		: match.test(message);
}

/**
 * Allow a console.error / console.warn in the current test (optionally only
 * messages containing a string or matching a RegExp). Allowed calls are
 * swallowed; assert on the returned mock when the message matters:
 * `expect(expectConsole("error", "boom")).toHaveBeenCalledTimes(1)`.
 */
export function expectConsole(method: Method, match?: Matcher): jest.Mock {
	const mock = jest.fn();
	allowed.push({ method, match, mock });
	return mock;
}

/** Called once from jest.setup-after-env.js. */
export function installConsoleGuard(): void {
	const originals = {} as Record<Method, typeof console.error>;

	beforeEach(() => {
		allowed = [];
		unexpected = [];
		for (const method of METHODS) {
			originals[method] = console[method];
			// Plain assignment, not jest.spyOn: tests call jest.restoreAllMocks().
			console[method] = (...args: unknown[]) => {
				const message = text(args);
				const hit = allowed.find(
					(entry) => entry.method === method && matches(entry.match, message),
				);
				if (hit) hit.mock(...args);
				else unexpected.push(`console.${method}: ${message}`);
			};
		}
	});

	afterEach(() => {
		for (const method of METHODS) console[method] = originals[method];
		const found = unexpected;
		unexpected = [];
		allowed = [];
		if (found.length > 0) {
			throw new Error(
				`Unexpected console output (use expectConsole to allow it):\n${found.join("\n")}`,
			);
		}
	});
}
