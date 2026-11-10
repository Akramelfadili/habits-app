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

/**
 * Deep-link guards for the routes that take a param. `habitsapp://...` can be opened by
 * any app or page on the phone, so a param is checked before a screen sees it; a malformed
 * one goes to Today with a warning in the log (the route and a reason code, never the
 * param, which is outside text).
 */
type Scope = "edit-habit" | "month";
type Refusal = Extract<ParamResult<unknown>, { ok: false }>["reason"];

function InvalidParam({ scope, reason }: { scope: Scope; reason: Refusal }) {
	useEffect(() => {
		log.warn("route.invalid_param", { scope, reason });
	}, [scope, reason]);
	return <Redirect href="/" />;
}

/** `edit-habit/[id]`: only a positive integer reaches the form. */
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
	// Only "frequency" is understood (Monthly's slipping insight); anything else is ignored.
	return (
		<HabitFormScreen
			habitId={habitId.value}
			focus={focus === "frequency" ? "frequency" : undefined}
		/>
	);
}

/** `month/[month]`: only a real "yyyy-MM-dd" day reaches the month screen. */
export function ProgressMonthRouteScreen({
	month,
}: {
	month: string | string[] | undefined;
}) {
	const day = parseMonthParam(month);
	if (!day.ok) return <InvalidParam scope="month" reason={day.reason} />;
	return <ProgressMonthScreen month={day.value} />;
}
