import { installGlobalHandlers } from "./global-handlers";
import { clearLog, getLogEntries } from "./logger";

type Handler = (error: unknown, isFatal?: boolean) => void;

function fakeErrorUtils(initial: Handler) {
	let current = initial;
	return {
		getGlobalHandler: () => current,
		setGlobalHandler: (handler: Handler) => {
			current = handler;
		},
		fire: (error: unknown, isFatal?: boolean) => current(error, isFatal),
	};
}

const globals = globalThis as Record<string, unknown>;
let originalErrorUtils: unknown;
let originalHermes: unknown;
let originalDev: boolean;

beforeEach(() => {
	clearLog();
	originalErrorUtils = globals.ErrorUtils;
	originalHermes = globals.HermesInternal;
	originalDev = __DEV__;
});

afterEach(() => {
	globals.ErrorUtils = originalErrorUtils;
	globals.HermesInternal = originalHermes;
	(globals as { __DEV__: boolean }).__DEV__ = originalDev;
});

describe("installGlobalHandlers", () => {
	it("logs the error and still calls the previous handler (red box / fatal)", () => {
		const previous = jest.fn();
		const utils = fakeErrorUtils(previous);
		globals.ErrorUtils = utils;
		const uninstall = installGlobalHandlers();

		const error = new Error("boom");
		utils.fire(error, true);

		expect(previous).toHaveBeenCalledWith(error, true);
		expect(getLogEntries()).toHaveLength(1);
		expect(getLogEntries()[0]).toMatchObject({
			level: "error",
			event: "global.fatal_error",
			fields: { isFatal: true },
		});
		uninstall();
	});

	it("logs a non-fatal error as unhandled", () => {
		const utils = fakeErrorUtils(jest.fn());
		globals.ErrorUtils = utils;
		const uninstall = installGlobalHandlers();
		utils.fire(new Error("boom"));
		expect(getLogEntries()[0].event).toBe("global.unhandled_error");
		uninstall();
	});

	it("does not wrap twice", () => {
		const previous = jest.fn();
		const utils = fakeErrorUtils(previous);
		globals.ErrorUtils = utils;
		const uninstall = installGlobalHandlers();
		installGlobalHandlers();
		utils.fire(new Error("once"));
		expect(previous).toHaveBeenCalledTimes(1);
		expect(getLogEntries()).toHaveLength(1);
		uninstall();
	});

	it("restores the previous handler on uninstall", () => {
		const previous = jest.fn();
		const utils = fakeErrorUtils(previous);
		globals.ErrorUtils = utils;
		installGlobalHandlers()();
		expect(utils.getGlobalHandler()).toBe(previous);
	});

	it("enables Hermes' rejection tracker in release only and logs rejections", () => {
		(globals as { __DEV__: boolean }).__DEV__ = false;
		const utils = fakeErrorUtils(jest.fn());
		globals.ErrorUtils = utils;
		let onUnhandled: ((id: number, rejection: unknown) => void) | undefined;
		globals.HermesInternal = {
			enablePromiseRejectionTracker: (options: {
				onUnhandled: (id: number, rejection: unknown) => void;
			}) => {
				onUnhandled = options.onUnhandled;
			},
		};
		const uninstall = installGlobalHandlers();
		onUnhandled?.(1, new Error("rejected"));
		expect(getLogEntries().map((e) => e.event)).toEqual([
			"global.unhandled_rejection",
		]);
		uninstall();
	});

	it("leaves rejections to React Native's own tracker in development", () => {
		(globals as { __DEV__: boolean }).__DEV__ = true;
		const enable = jest.fn();
		globals.HermesInternal = { enablePromiseRejectionTracker: enable };
		globals.ErrorUtils = fakeErrorUtils(jest.fn());
		installGlobalHandlers()();
		expect(enable).not.toHaveBeenCalled();
	});

	it("warns when release has no rejection tracker", () => {
		(globals as { __DEV__: boolean }).__DEV__ = false;
		globals.HermesInternal = undefined;
		globals.ErrorUtils = fakeErrorUtils(jest.fn());
		installGlobalHandlers()();
		expect(getLogEntries()[0]).toMatchObject({ level: "warn" });
	});
});
