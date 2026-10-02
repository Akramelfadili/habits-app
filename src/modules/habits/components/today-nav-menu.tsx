import { useRouter } from "expo-router";
import { MenuRow } from "@/components/ui/composite/menu-row";
import { NavMenu, NavMenuDivider } from "@/components/ui/composite/nav-menu";
import { useTodayMenuQueries } from "../hooks/use-today-menu-queries";

type TodayNavMenuProps = {
	anchorBottom: number;
	onClose: () => void;
};

/**
 * Today's `⋯` menu (HAB-14): summaries first (used daily), then management,
 * then settings. Mounted only while open (see `useTodayMenuQueries`).
 */
export function TodayNavMenu({ anchorBottom, onClose }: TodayNavMenuProps) {
	const router = useRouter();
	const menu = useTodayMenuQueries();

	function go(
		href:
			| "/habits/week"
			| "/habits/month"
			| "/habits/year"
			| "/habits/manage"
			| "/habits/settings",
	) {
		onClose();
		router.push(href);
	}

	return (
		<NavMenu anchorBottom={anchorBottom} label="Summaries" onClose={onClose}>
			<MenuRow
				symbol="chart.bar"
				title="Weekly summary"
				subline={menu.weekly.subline}
				disabledReason={menu.weekly.disabledReason}
				onPress={() => go("/habits/week")}
			/>
			<MenuRow
				symbol="calendar"
				title="Monthly"
				subline={menu.monthly.subline}
				disabledReason={menu.monthly.disabledReason}
				onPress={() => go("/habits/month")}
			/>
			<MenuRow
				symbol="circle"
				title="Yearly"
				subline={menu.yearly.subline}
				disabledReason={menu.yearly.disabledReason}
				onPress={() => go("/habits/year")}
			/>
			<NavMenuDivider />
			<MenuRow
				symbol="list.bullet"
				title="Manage & archive"
				subline={menu.manage.subline}
				onPress={() => go("/habits/manage")}
			/>
			<MenuRow
				symbol="gearshape"
				title="Settings"
				subline={menu.settings.subline}
				onPress={() => go("/habits/settings")}
			/>
		</NavMenu>
	);
}
