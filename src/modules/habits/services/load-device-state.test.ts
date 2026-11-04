import { loadDeviceState } from "./load-device-state";

const mockReplace = jest.fn(async (_state: unknown) => {});
jest.mock("../repositories/dev-state-repository", () => ({
	replaceAllData: (state: unknown) => mockReplace(state),
}));

describe("loadDeviceState", () => {
	it("writes the scenario named by the route's query", async () => {
		await loadDeviceState("?fixtures=first-run");
		expect(mockReplace).toHaveBeenCalledWith(
			expect.objectContaining({ scenario: "first-run", habits: [] }),
		);
	});
});
