import { clearLog, getLogEntries } from "@/lib/logger/logger";
import { useToastStore } from "@/store/toast-store";
import { runSafely } from "./run-safely";

beforeEach(() => {
	clearLog();
	useToastStore.setState({ toast: null });
});

describe("runSafely", () => {
	it("resolves ok with the value and shows nothing", async () => {
		const result = await runSafely({ scope: "t" }, async () => 7);
		expect(result).toEqual({ ok: true, value: 7 });
		expect(useToastStore.getState().toast).toBeNull();
		expect(getLogEntries()).toHaveLength(0);
	});

	it.each([
		["a rejection", () => Promise.reject(new Error("boom"))],
		[
			"a synchronous throw",
			() => {
				throw new Error("boom");
			},
		],
	])(
		"never rejects on %s: logs it and shows the error toast",
		async (_n, action) => {
			const result = await runSafely(
				{ scope: "t", failure: "Couldn't save this habit. Try again." },
				action,
			);
			expect(result).toMatchObject({ ok: false });
			expect(useToastStore.getState().toast).toMatchObject({
				message: "Couldn't save this habit. Try again.",
				tone: "error",
			});
			expect(getLogEntries()).toHaveLength(1);
			expect(getLogEntries()[0]).toMatchObject({ level: "error", scope: "t" });
		},
	);

	it("falls back to the generic message", async () => {
		await runSafely({ scope: "t" }, async () => {
			throw new Error("boom");
		});
		expect(useToastStore.getState().toast?.message).toBe(
			"Something went wrong. Try again.",
		);
	});

	it("uses onFailure instead of the toast where no ToastHost exists", async () => {
		const onFailure = jest.fn();
		await runSafely(
			{ scope: "t", failure: "Couldn't save.", onFailure },
			async () => {
				throw new Error("boom");
			},
		);
		expect(onFailure).toHaveBeenCalledWith(expect.any(Error), "Couldn't save.");
		expect(useToastStore.getState().toast).toBeNull();
		expect(getLogEntries()).toHaveLength(1);
	});

	it("wraps a non-Error throw", async () => {
		const result = await runSafely({ scope: "t" }, async () => {
			throw "nope";
		});
		expect(result).toMatchObject({ ok: false, error: expect.any(Error) });
	});
});
