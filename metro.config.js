const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Drizzle migrations are generated as .sql files and imported directly
// (see src/lib/db/migrations) — Metro needs to treat them as source.
config.resolver.sourceExts.push("sql");

module.exports = config;
