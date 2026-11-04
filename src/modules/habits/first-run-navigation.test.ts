import { leaveFirstRun } from "./first-run-navigation";
import { useFirstRunOfferStore } from "./first-run-offer-store";

describe("leaveFirstRun", () => {
	it("pops First Run's screens and then opens Today", () => {
		const calls: string[] = [];
		leaveFirstRun({
			canDismiss: () => true,
			dismissAll: () => calls.push("dismissAll"),
			replace: (href) => calls.push(`replace ${href}`),
		});
		expect(calls).toEqual(["dismissAll", "replace /"]);
	});

	it("only replaces when there is nothing to pop", () => {
		const calls: string[] = [];
		leaveFirstRun({
			canDismiss: () => false,
			dismissAll: () => calls.push("dismissAll"),
			replace: (href) => calls.push(`replace ${href}`),
		});
		expect(calls).toEqual(["replace /"]);
	});

	it("marks the landing, so Today is drawn without the tab bar (FR3, FR4)", () => {
		useFirstRunOfferStore.setState({ landing: false });
		leaveFirstRun({
			canDismiss: () => false,
			dismissAll: () => {},
			replace: () => {},
		});
		expect(useFirstRunOfferStore.getState().landing).toBe(true);
	});
});
