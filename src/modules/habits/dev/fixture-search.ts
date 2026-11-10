// The device-validation build has no page URL, so `dev-state` hands the query over here.
let override = "";

export function setFixtureSearch(search: string): void {
	override = search;
}

export function fixtureSearch(): string {
	return globalThis.location?.search ?? override;
}
