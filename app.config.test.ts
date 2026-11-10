import fs from "node:fs";
import path from "node:path";
import {
	buildConfig,
	DARK_SPLASH_BACKGROUND,
	resolveVariant,
} from "./app.config";
import { version } from "./package.json";
import { surfaceColors } from "./src/theme/theme";

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

	describe("release identity", () => {
		it.each(["development", "preview", "production"] as const)(
			"%s: version comes from package.json, no build number, phone only, no export prompt",
			(variant) => {
				const config = buildConfig({ APP_VARIANT: variant });
				expect(config.version).toBe(version);
				expect(config.ios).not.toHaveProperty("buildNumber");
				expect(config.ios?.supportsTablet).toBe(false);
				expect(config.ios?.infoPlist).toEqual({
					ITSAppUsesNonExemptEncryption: false,
				});
			},
		);

		it("has no runtimeVersion, updates block or expo-updates plugin (no OTA)", () => {
			const config = buildConfig({ APP_VARIANT: "production" });
			expect(config).not.toHaveProperty("runtimeVersion");
			expect(config).not.toHaveProperty("updates");
			expect(JSON.stringify(config.plugins)).not.toContain("expo-updates");
		});

		it("copies the dark background token exactly (Expo's loader cannot import it)", () => {
			expect(DARK_SPLASH_BACKGROUND).toBe(surfaceColors.dark.bg);
		});

		it("gives the splash a dark block on the theme's dark background", () => {
			const splash = buildConfig({ APP_VARIANT: "production" }).plugins?.find(
				(plugin) => Array.isArray(plugin) && plugin[0] === "expo-splash-screen",
			);
			expect(splash).toBeDefined();
			const options = (splash as [string, Record<string, unknown>])[1];
			expect(options.dark).toEqual({
				backgroundColor: DARK_SPLASH_BACKGROUND,
				image: options.image,
			});
		});
	});

	describe("EAS preview and development profiles", () => {
		it.each(["preview", "development"] as const)(
			"%s builds with its own variant and may carry no production-only guard",
			(profile) => {
				expect(() =>
					buildConfig({ EAS_BUILD_PROFILE: profile, APP_VARIANT: profile }),
				).not.toThrow();
			},
		);
	});

	describe("eas.json", () => {
		type Profile = { env?: Record<string, string>; [key: string]: unknown };
		const eas = JSON.parse(
			fs.readFileSync(path.join(__dirname, "eas.json"), "utf8"),
		) as {
			cli?: { appVersionSource?: string };
			build: Record<string, Profile>;
			submit?: unknown;
		};

		it("has exactly the development, preview and production profiles", () => {
			expect(Object.keys(eas.build).sort()).toEqual([
				"development",
				"preview",
				"production",
			]);
		});

		it("takes the build number from EAS (remote) and auto-increments in production", () => {
			expect(eas.cli?.appVersionSource).toBe("remote");
			expect(eas.build.production.autoIncrement).toBe(true);
			expect(eas.build.production.distribution).toBe("store");
			expect(eas.build.preview.distribution).toBe("internal");
			expect(eas.build.development.developmentClient).toBe(true);
			expect(eas.build.development.distribution).toBe("internal");
		});

		it("never sets a dev-only switch in any profile", () => {
			for (const [name, profile] of Object.entries(eas.build)) {
				const env = profile.env ?? {};
				expect({ name, has: "EXPO_PUBLIC_DEVICE_VALIDATION" in env }).toEqual({
					name,
					has: false,
				});
				expect({ name, has: "EXPO_PUBLIC_STARTER_PROFILE" in env }).toEqual({
					name,
					has: false,
				});
			}
		});

		it("sets the matching APP_VARIANT in every profile", () => {
			for (const name of ["development", "preview", "production"]) {
				expect(eas.build[name].env?.APP_VARIANT).toBe(name);
			}
		});

		it("holds no store id or credentials", () => {
			const text = JSON.stringify(eas);
			expect(eas.submit).toBeUndefined();
			expect(text).not.toMatch(/ascAppId|appleId|appleTeamId|\.p8|\.p12/);
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
