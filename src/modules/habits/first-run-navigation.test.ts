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

	it("says First Run was left before navigating, so the tabs gate does not bounce back", () => {
		useFirstRunOfferStore.setState({ leftFirstRun: false });
		leaveFirstRun({
			canDismiss: () => false,
			dismissAll: () => {},
			replace: () => {},
		});
		expect(useFirstRunOfferStore.getState().leftFirstRun).toBe(true);
	});
});
