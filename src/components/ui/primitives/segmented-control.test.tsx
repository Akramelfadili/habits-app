import { fireEvent, render, screen } from "@testing-library/react-native";
import { SegmentedControl } from "./segmented-control";

const options: [
	{ value: "build"; label: string },
	{ value: "break"; label: string },
] = [
	{ value: "build", label: "Build" },
	{ value: "break", label: "Break" },
];

describe("SegmentedControl", () => {
	it("calls onChange with the tapped option's value", async () => {
		const onChange = jest.fn();
		await render(
			<SegmentedControl options={options} value="build" onChange={onChange} />,
		);

		await fireEvent.press(screen.getByText("Break"));
		expect(onChange).toHaveBeenCalledWith("break");
	});

	it("marks the current value's segment as selected", async () => {
		await render(
			<SegmentedControl options={options} value="build" onChange={jest.fn()} />,
		);
		expect(
			screen.getByText("Build").parent?.props.accessibilityState.selected,
		).toBe(true);
		expect(
			screen.getByText("Break").parent?.props.accessibilityState.selected,
		).toBe(false);
	});

	it("blocks onChange when disabled", async () => {
		const onChange = jest.fn();
		await render(
			<SegmentedControl
				options={options}
				value="build"
				onChange={onChange}
				disabled
			/>,
		);

		await fireEvent.press(screen.getByText("Break"));
		expect(onChange).not.toHaveBeenCalled();
	});

	it("supports three options and reports the tapped one (Appearance, HAB-15)", async () => {
		const onChange = jest.fn();
		await render(
			<SegmentedControl
				options={[
					{ value: "light", label: "Light" },
					{ value: "dark", label: "Dark" },
					{ value: "system", label: "System" },
				]}
				value="system"
				onChange={onChange}
			/>,
		);
		await fireEvent.press(screen.getByText("Dark"));
		expect(onChange).toHaveBeenCalledWith("dark");
		expect(screen.getAllByRole("button")).toHaveLength(3);
	});
});
