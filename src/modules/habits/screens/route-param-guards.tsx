import { Redirect } from "expo-router";
import { useEffect } from "react";
import { log } from "@/lib/logger/logger";
import {
	type ParamResult,
	parseHabitIdParam,
	parseMonthParam,
} from "../domain/route-params";
import { HabitFormScreen } from "./habit-form-screen";
import { ProgressMonthScreen } from "./progress-month-screen";

// `habitsapp://...` can be opened by any app or page on the phone: a malformed param goes to Today and the log gets the route and a reason code, never the param (outside text).
type Scope = "edit-habit" | "month";
type Refusal = Extract<ParamResult<unknown>, { ok: false }>["reason"];

function InvalidParam({ scope, reason }: { scope: Scope; reason: Refusal }) {
	useEffect(() => {
		log.warn("route.invalid_param", { scope, reason });
	}, [scope, reason]);
	return <Redirect href="/" />;
}

export function EditHabitRouteScreen({
	id,
	focus,
}: {
	id: string | string[] | undefined;
	focus: string | string[] | undefined;
}) {
	const habitId = parseHabitIdParam(id);
	if (!habitId.ok) {
		return <InvalidParam scope="edit-habit" reason={habitId.reason} />;
	}
	return (
		<HabitFormScreen
			habitId={habitId.value}
			focus={focus === "frequency" ? "frequency" : undefined}
		/>
	);
}

export function ProgressMonthRouteScreen({
	month,
}: {
	month: string | string[] | undefined;
}) {
	const day = parseMonthParam(month);
	if (!day.ok) return <InvalidParam scope="month" reason={day.reason} />;
	return <ProgressMonthScreen month={day.value} />;
}
