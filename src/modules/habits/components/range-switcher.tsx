import { useRouter } from "expo-router";
import { SegmentedControl } from "@/components/ui/primitives/segmented-control";

type Range = "week" | "month" | "year";

type RangeSwitcherProps = {
	/** The summary being shown; the other screens are siblings reached by replacing this one, so Back stays "Today". */
	value: "week" | "month";
};

/**
 * Week / Month / Year under a summary's title (HAB-16, VAR-01 3-up). Year is
 * drawn but disabled until HAB-17 builds its screen.
 */
export function RangeSwitcher({ value }: RangeSwitcherProps) {
	const router = useRouter();

	function change(next: Range) {
		if (next === value || next === "year") return;
		router.replace(next === "week" ? "/habits/week" : "/habits/month");
	}

	return (
		<SegmentedControl<Range>
			options={[
				{ value: "week", label: "Week" },
				{ value: "month", label: "Month" },
				// TODO(HAB-17): enable once the Yearly summary exists.
				{ value: "year", label: "Year", disabled: true },
			]}
			value={value}
			onChange={change}
		/>
	);
}
