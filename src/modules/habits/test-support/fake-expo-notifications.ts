/**
 * An in-memory stand-in for `expo-notifications`' scheduling surface, for
 * tests that exercise the real notifications adapter and the reminder
 * services end to end. Failures are injected per call number.
 */
export type FakeScheduled = {
	identifier: string;
	hour: number;
	minute: number;
};

export function createFakeNotifications() {
	const scheduled = new Map<string, FakeScheduled>();
	/** Every schedule/cancel, in order: "schedule:<id>" / "cancel:<id>". */
	const events: string[] = [];
	let scheduleCalls = 0;
	let cancelCalls = 0;
	const failScheduleOn = new Set<number>();
	const failCancelOn = new Set<number>();
	let permission: "granted" | "denied" | "undetermined" = "granted";
	const permissionRequests: number[] = [];

	return {
		scheduled,
		events,
		/** The calls made (1-based) that should reject. */
		failScheduleOn,
		failCancelOn,
		get scheduleCalls() {
			return scheduleCalls;
		},
		get cancelCalls() {
			return cancelCalls;
		},
		permissionRequests,
		setPermission(next: typeof permission) {
			permission = next;
		},
		reset() {
			scheduled.clear();
			events.length = 0;
			scheduleCalls = 0;
			cancelCalls = 0;
			failScheduleOn.clear();
			failCancelOn.clear();
			permission = "granted";
			permissionRequests.length = 0;
		},
		module: {
			SchedulableTriggerInputTypes: { DAILY: "daily", CALENDAR: "calendar" },
			IosAuthorizationStatus: {
				NOT_DETERMINED: 0,
				DENIED: 1,
				AUTHORIZED: 2,
				PROVISIONAL: 3,
				EPHEMERAL: 4,
			},
			setNotificationHandler: () => {},
			async scheduleNotificationAsync(request: {
				identifier: string;
				trigger: { hour: number; minute: number };
			}) {
				scheduleCalls++;
				if (failScheduleOn.has(scheduleCalls)) {
					throw new Error("schedule failed");
				}
				events.push(`schedule:${request.identifier}`);
				scheduled.set(request.identifier, {
					identifier: request.identifier,
					hour: request.trigger.hour,
					minute: request.trigger.minute,
				});
				return request.identifier;
			},
			async cancelScheduledNotificationAsync(identifier: string) {
				cancelCalls++;
				if (failCancelOn.has(cancelCalls)) throw new Error("cancel failed");
				events.push(`cancel:${identifier}`);
				scheduled.delete(identifier);
			},
			async getAllScheduledNotificationsAsync() {
				return [...scheduled.values()].map(({ identifier }) => ({
					identifier,
				}));
			},
			async getPermissionsAsync() {
				return {
					granted: permission === "granted",
					status: permission,
					ios: {
						status:
							permission === "granted" ? 2 : permission === "denied" ? 1 : 0,
					},
				};
			},
			async requestPermissionsAsync() {
				permissionRequests.push(Date.now());
				return {
					granted: false,
					status: "denied",
					ios: { status: 1 },
				};
			},
		},
	};
}

/** One instance per Jest module registry (= per test file). */
export const fakeNotifications = createFakeNotifications();
