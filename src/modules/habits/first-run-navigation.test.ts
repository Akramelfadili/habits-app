import { leaveFirstRun } from "./first-run-navigation";

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
});
