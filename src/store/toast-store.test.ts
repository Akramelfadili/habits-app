import { showToast, useToastStore } from "./toast-store";

describe("toast store", () => {
	beforeEach(() => useToastStore.setState({ toast: null }));

	it("shows the latest toast, replacing the previous one", () => {
		showToast({ message: "First" });
		showToast({ message: "Second", actionLabel: "Undo" });
		expect(useToastStore.getState().toast).toMatchObject({
			message: "Second",
			actionLabel: "Undo",
		});
	});

	it("only dismisses the toast it was asked about", () => {
		showToast({ message: "First" });
		const first = useToastStore.getState().toast?.id ?? -1;
		showToast({ message: "Second" });

		// A stale timer for "First" must not clear "Second".
		useToastStore.getState().dismissToast(first);
		expect(useToastStore.getState().toast?.message).toBe("Second");

		const second = useToastStore.getState().toast?.id ?? -1;
		useToastStore.getState().dismissToast(second);
		expect(useToastStore.getState().toast).toBeNull();
	});
});
