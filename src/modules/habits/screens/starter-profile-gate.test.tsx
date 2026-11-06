import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

const mockApply = jest.fn();
jest.mock("../services/starter-profile-service", () => ({
	applyStarterProfile: (raw: string | undefined) => mockApply(raw),
}));

import { StarterProfileGate } from "./starter-profile-gate";

const gate = (
	<StarterProfileGate>
		<Text>app</Text>
	</StarterProfileGate>
);

describe("StarterProfileGate", () => {
	it("renders nothing until the profile is applied, then the app, applying once", async () => {
		let finish: (value: string) => void = () => undefined;
		mockApply.mockReturnValue(
			new Promise((resolve) => {
				finish = resolve;
			}),
		);

		const view = await render(gate);
		expect(screen.queryByText("app")).toBeNull();

		finish("applied");
		await waitFor(() => expect(screen.getByText("app")).toBeTruthy());

		await view.rerender(gate);
		expect(mockApply).toHaveBeenCalledTimes(1);
	});
});
