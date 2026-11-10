import { buildConfig, resolveVariant } from "./app.config";

describe("app.config", () => {
	it("defaults to the development variant", () => {
		const config = buildConfig({});
		expect(config.name).toBe("Habits Dev");
		expect(config.ios?.bundleIdentifier).toBe("com.akramelfadili.habits.dev");
		expect(config.scheme).toBe("habitsapp-dev");
		expect(resolveVariant({ APP_VARIANT: "" })).toBe("development");
	});

	it("production is the real app", () => {
		const config = buildConfig({ APP_VARIANT: "production" });
		expect(config.name).toBe("Habits");
		expect(config.ios?.bundleIdentifier).toBe("com.akramelfadili.habits");
		expect(config.scheme).toBe("habitsapp");
	});

	it("preview never uses the production id", () => {
		const config = buildConfig({ APP_VARIANT: "preview" });
		expect(config.name).toBe("Habits Preview");
		expect(config.ios?.bundleIdentifier).toBe("com.akramelfadili.habits.dev");
	});

	it.each(["development", "preview", "production"] as const)(
		"%s declares no tracking and no collected data, and no accessed-API entries yet",
		(variant) => {
			const manifest = buildConfig({ APP_VARIANT: variant }).ios
				?.privacyManifests;
			expect(manifest).toEqual({
				NSPrivacyTracking: false,
				NSPrivacyTrackingDomains: [],
				NSPrivacyCollectedDataTypes: [],
			});
			expect(manifest).not.toHaveProperty("NSPrivacyAccessedAPITypes");
		},
	);

	it("rejects an unknown variant", () => {
		expect(() => buildConfig({ APP_VARIANT: "prod" })).toThrow(/APP_VARIANT/);
	});

	it("keeps the rest of the old app.json", () => {
		const config = buildConfig({ APP_VARIANT: "production" });
		expect(config.slug).toBe("habits-app");
		expect(config.experiments).toEqual({
			typedRoutes: true,
			reactCompiler: true,
		});
		expect(config.plugins).toContain("expo-sqlite");
	});

	describe("EAS production profile", () => {
		const eas = { EAS_BUILD_PROFILE: "production" };

		it("passes with the production variant and no dev switches", () => {
			expect(() =>
				buildConfig({ ...eas, APP_VARIANT: "production" }),
			).not.toThrow();
		});

		it("throws for any other variant, or none", () => {
			expect(() => buildConfig({ ...eas, APP_VARIANT: "preview" })).toThrow();
			expect(() => buildConfig({ ...eas })).toThrow();
		});

		it("throws when device validation is on", () => {
			expect(() =>
				buildConfig({
					...eas,
					APP_VARIANT: "production",
					EXPO_PUBLIC_DEVICE_VALIDATION: "1",
				}),
			).toThrow(/DEVICE_VALIDATION/);
		});

		it("throws when a starter profile is set", () => {
			expect(() =>
				buildConfig({
					...eas,
					APP_VARIANT: "production",
					EXPO_PUBLIC_STARTER_PROFILE: "./profile.json",
				}),
			).toThrow(/STARTER_PROFILE/);
		});

		it("ignores the bundle id override outside device validation", () => {
			const config = buildConfig({
				...eas,
				APP_VARIANT: "production",
				BUNDLE_ID: "x.y.z",
			});
			expect(config.ios?.bundleIdentifier).toBe("com.akramelfadili.habits");
		});
	});

	it("honours the bundle id override only for a device-validation build", () => {
		const config = buildConfig({
			APP_VARIANT: "production",
			EXPO_PUBLIC_DEVICE_VALIDATION: "1",
			BUNDLE_ID: "dev.habitsapp.validation",
		});
		expect(config.ios?.bundleIdentifier).toBe("dev.habitsapp.validation");
		expect(config.scheme).toBe("habitsapp");
	});
});
