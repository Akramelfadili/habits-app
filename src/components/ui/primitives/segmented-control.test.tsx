import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
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
			screen.getByRole("tab", { name: "Build" }).props.accessibilityState
				.selected,
		).toBe(true);
		expect(
			screen.getByRole("tab", { name: "Break" }).props.accessibilityState
				.selected,
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
		expect(screen.getAllByRole("tab")).toHaveLength(3);
	});
});

describe("SegmentedControl — accessibility and touch targets (A6-03, A6-05)", () => {
	it("is a labelled tab list whose segments are tabs", async () => {
		await render(
			<SegmentedControl
				options={options}
				value="build"
				onChange={jest.fn()}
				label="Direction"
			/>,
		);
		const group = screen.getByLabelText("Direction");
		expect(group.props.accessibilityRole).toBe("tablist");
		expect(screen.getAllByRole("tab")).toHaveLength(2);
	});

	it("gives every segment a 44pt-tall touch column that abuts its neighbour (no hitSlop to overlap)", async () => {
		await render(
			<SegmentedControl options={options} value="build" onChange={jest.fn()} />,
		);
		for (const tab of screen.getAllByRole("tab")) {
			const style = StyleSheet.flatten(tab.props.style);
			expect(style.minHeight).toBe(44);
			expect(style.flex).toBe(1);
			expect(tab.props.hitSlop).toBeUndefined();
		}
	});
});

describe("SegmentedControl — one segment disabled (range switcher, HAB-16)", () => {
	const three: [
		{ value: "week"; label: string },
		{ value: "month"; label: string },
		{ value: "year"; label: string; disabled: true },
	] = [
		{ value: "week", label: "Week" },
		{ value: "month", label: "Month" },
		{ value: "year", label: "Year", disabled: true },
	];

	it("blocks just the disabled segment and leaves the others live", async () => {
		const onChange = jest.fn();
		await render(
			<SegmentedControl options={three} value="week" onChange={onChange} />,
		);
		await fireEvent.press(screen.getByText("Year"));
		expect(onChange).not.toHaveBeenCalled();
		expect(
			screen.getByRole("tab", { name: "Year" }).props.accessibilityState
				.disabled,
		).toBe(true);

		await fireEvent.press(screen.getByText("Month"));
		expect(onChange).toHaveBeenCalledWith("month");
	});
});
