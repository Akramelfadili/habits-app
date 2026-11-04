import { act, renderHook } from "@testing-library/react-native";
import { useFirstRunOfferStore } from "../first-run-offer-store";

const mockMarkFirstRunSeen = jest.fn();
jest.mock("./use-first-run-actions", () => ({
	useFirstRunActions: () => ({ markFirstRunSeen: mockMarkFirstRunSeen }),
}));

import { useFirstRunSkipActions } from "./use-first-run-skip-actions";

function router() {
	return {
		canDismiss: () => false,
		dismissAll: jest.fn(),
		replace: jest.fn(),
	};
}

describe("useFirstRunSkipActions", () => {
	beforeEach(() => {
		mockMarkFirstRunSeen.mockReset();
		useFirstRunOfferStore.setState({ skipFailed: false, leftFirstRun: false });
	});

	it("marks First Run seen and then leaves it for Today", async () => {
		mockMarkFirstRunSeen.mockResolvedValue({ ok: true });
		const { result } = await renderHook(() => useFirstRunSkipActions());
		const r = router();
		await act(() => result.current.skip(r));
		expect(r.replace).toHaveBeenCalledWith("/");
		expect(useFirstRunOfferStore.getState().skipFailed).toBe(false);
	});

	it("stays on FR2 and says so when the flag cannot be written", async () => {
		mockMarkFirstRunSeen.mockResolvedValue({ ok: false });
		const { result } = await renderHook(() => useFirstRunSkipActions());
		const r = router();
		await act(() => result.current.skip(r));
		expect(r.replace).not.toHaveBeenCalled();
		expect(useFirstRunOfferStore.getState().skipFailed).toBe(true);
	});

	it("clears an earlier failure once a retry works", async () => {
		useFirstRunOfferStore.setState({ skipFailed: true });
		mockMarkFirstRunSeen.mockResolvedValue({ ok: true });
		const { result } = await renderHook(() => useFirstRunSkipActions());
		await act(() => result.current.skip(router()));
		expect(useFirstRunOfferStore.getState().skipFailed).toBe(false);
	});
});
