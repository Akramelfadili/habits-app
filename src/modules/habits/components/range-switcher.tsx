import { useRouter } from "expo-router";
import { SegmentedControl } from "@/components/ui/primitives/segmented-control";

type Range = "week" | "month" | "year";

const ROUTES = {
	week: "/habits/week",
	month: "/habits/month",
	year: "/habits/year",
} as const;

type RangeSwitcherProps = {
	/** The summary being shown; the others are siblings reached by replacing this one, so Back stays "Today". */
	value: Range;
};

/** Week / Month / Year under a summary's title (HAB-16/HAB-17, VAR-01 3-up). */
export function RangeSwitcher({ value }: RangeSwitcherProps) {
	const router = useRouter();

	function change(next: Range) {
		if (next === value) return;
		router.replace(ROUTES[next]);
	}

	return (
		<SegmentedControl<Range>
			label="Summary period"
			options={[
				{ value: "week", label: "Week" },
				{ value: "month", label: "Month" },
				{ value: "year", label: "Year" },
			]}
			value={value}
			onChange={change}
		/>
	);
}
