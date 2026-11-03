import { renderHook } from "@testing-library/react-native";
import { useToastStore } from "@/store/toast-store";

let mockResult: "copied" | "shared" | "failed" = "copied";
jest.mock("@/lib/diagnostics/diagnostics", () => ({
	copyDiagnostics: async () => mockResult,
}));

import { useDiagnosticsActions } from "./use-diagnostics-actions";

beforeEach(() => useToastStore.setState({ toast: null } as never));

describe("useDiagnosticsActions", () => {
	it.each([
		["copied", "Diagnostics copied", "info"],
		["shared", "Diagnostics ready to share", "info"],
		["failed", "Couldn’t copy diagnostics. Try again.", "error"],
	] as const)("%s says %s", async (result, message, tone) => {
		mockResult = result;
		const { result: hook } = await renderHook(() => useDiagnosticsActions());
		await hook.current.copyDiagnostics();
		expect(useToastStore.getState().toast).toMatchObject({ message, tone });
	});
});
