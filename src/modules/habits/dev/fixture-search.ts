/**
 * The query string a fixture scenario reads its flags from. On web that is the
 * page's own (`?longNames=1`); on the device-validation build (the simulator)
 * there is no page URL, so `dev-state` hands it over with `setFixtureSearch`.
 */
let override = "";

export function setFixtureSearch(search: string): void {
	override = search;
}

export function fixtureSearch(): string {
	return globalThis.location?.search ?? override;
}
