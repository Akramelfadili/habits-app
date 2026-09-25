module.exports = (api) => {
	api.cache(true);
	return {
		presets: ["babel-preset-expo"],
		// Drizzle migrations are generated as .sql files (src/lib/db/migrations) and
		// imported directly — without this, Metro hands the raw SQL to the JS
		// transformer and bundling fails with a syntax error. metro.config.js's
		// sourceExts addition alone only gets .sql into the transform pipeline;
		// this plugin is what turns that import into an inlined string.
		plugins: [["inline-import", { extensions: [".sql"] }]],
	};
};
