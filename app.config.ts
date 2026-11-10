import type { ExpoConfig } from "expo/config";

/**
 * The one app config (replaces app.json). `APP_VARIANT` picks the identity:
 *
 *   production   "Habits"          com.akramelfadili.habits      habitsapp
 *   development  "Habits Dev"      com.akramelfadili.habits.dev  habitsapp-dev
 *   preview      "Habits Preview"  com.akramelfadili.habits.dev  habitsapp-dev
 *
 * Unset means development, so a dev client can never be mistaken for (or
 * overwrite) the real app on the phone. Preview deliberately does NOT use the
 * production id: installing it would replace the real app and share its data.
 *
 * `buildConfig` is pure (env in, config out) so it can be unit-tested; the
 * default export is what Expo loads. docs/decisions/010-app-variants-and-recovery.md.
 */
export type AppVariant = "development" | "preview" | "production";

type Env = Record<string, string | undefined>;

const IDENTITY: Record<
	AppVariant,
	{ name: string; bundleIdentifier: string; scheme: string }
> = {
	production: {
		name: "Habits",
		bundleIdentifier: "com.akramelfadili.habits",
		scheme: "habitsapp",
	},
	development: {
		name: "Habits Dev",
		bundleIdentifier: "com.akramelfadili.habits.dev",
		scheme: "habitsapp-dev",
	},
	preview: {
		name: "Habits Preview",
		bundleIdentifier: "com.akramelfadili.habits.dev",
		scheme: "habitsapp-dev",
	},
};

export function resolveVariant(env: Env): AppVariant {
	const raw = env.APP_VARIANT;
	if (raw === undefined || raw === "") return "development";
	if (raw === "development" || raw === "preview" || raw === "production") {
		return raw;
	}
	throw new Error(
		`APP_VARIANT must be development, preview or production (got "${raw}").`,
	);
}

/** Throws when a production EAS build could carry a dev-only switch. */
function assertProductionBuildIsClean(env: Env, variant: AppVariant): void {
	if (env.EAS_BUILD_PROFILE !== "production") return;
	if (variant !== "production") {
		throw new Error(
			`EAS profile "production" needs APP_VARIANT=production (got "${variant}").`,
		);
	}
	if (env.EXPO_PUBLIC_DEVICE_VALIDATION === "1") {
		throw new Error(
			"A production build must not set EXPO_PUBLIC_DEVICE_VALIDATION.",
		);
	}
	if (env.EXPO_PUBLIC_STARTER_PROFILE) {
		throw new Error(
			"A production build must not set EXPO_PUBLIC_STARTER_PROFILE.",
		);
	}
}

export function buildConfig(env: Env): ExpoConfig {
	const variant = resolveVariant(env);
	assertProductionBuildIsClean(env, variant);
	const identity = IDENTITY[variant];
	// The manual simulator workflow gives its throwaway build its own id; the
	// override is honoured only for a device-validation build.
	const bundleIdentifier =
		env.EXPO_PUBLIC_DEVICE_VALIDATION === "1" && env.BUNDLE_ID
			? env.BUNDLE_ID
			: identity.bundleIdentifier;

	return {
		name: identity.name,
		slug: "habits-app",
		version: "1.0.0",
		orientation: "portrait",
		icon: "./assets/images/icon.png",
		scheme: identity.scheme,
		userInterfaceStyle: "automatic",
		ios: {
			icon: "./assets/expo.icon",
			bundleIdentifier,
			// The app collects nothing and tracks nothing (docs/how-to/app-store-privacy.md).
			// Accessed-API (required reason) entries are deliberately absent until the
			// first EAS build shows which categories App Store Connect reports missing.
			privacyManifests: {
				NSPrivacyTracking: false,
				NSPrivacyTrackingDomains: [],
				NSPrivacyCollectedDataTypes: [],
			},
		},
		android: {
			adaptiveIcon: {
				backgroundColor: "#E6F4FE",
				foregroundImage: "./assets/images/android-icon-foreground.png",
				backgroundImage: "./assets/images/android-icon-background.png",
				monochromeImage: "./assets/images/android-icon-monochrome.png",
			},
			predictiveBackGestureEnabled: false,
		},
		web: {
			output: "static",
			favicon: "./assets/images/favicon.png",
		},
		plugins: [
			"expo-router",
			[
				"expo-splash-screen",
				{
					backgroundColor: "#208AEF",
					image: "./assets/images/splash-icon.png",
					imageWidth: 76,
				},
			],
			"expo-sqlite",
			"expo-notifications",
			"expo-sharing",
		],
		experiments: {
			typedRoutes: true,
			reactCompiler: true,
		},
	};
}

export default (): ExpoConfig => buildConfig(process.env);
