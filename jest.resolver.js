// Reanimated 4.7 needs its own resolver under Jest (it picks the web
// implementation over the native one, which throws without a native runtime),
// but jest-expo's preset already sets React Native's resolver, which keeps
// `react-native/Libraries/*` deep imports mockable. Run Reanimated's first and
// let it fall through to React Native's instead of replacing it.
const reanimatedResolver = require("react-native-reanimated/jest/resolver");
const reactNativeResolver = require(require("jest-expo/jest-preset").resolver);

module.exports = (request, options) =>
	reanimatedResolver(request, {
		...options,
		defaultResolver: (path, nextOptions) =>
			reactNativeResolver(path, {
				...nextOptions,
				defaultResolver: options.defaultResolver,
			}),
	});
