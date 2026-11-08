# Habits

A personal iOS habit-tracking app built with Expo, React Native and TypeScript. Habits only: three tabs (Today, Progress, Habits). Data lives on the device in SQLite (Drizzle ORM); there is no backend.

## Run it

```bash
npm install
npx expo start        # native modules need a dev-client build, not Expo Go
make check            # the gate: Biome, tsc, Jest, tooling tests, architecture and repo-hygiene checks
```

Use `npx expo install <package>` (not `npm install`) for Expo / React Native packages. Versions: see `package.json`. More commands: `make help`.

Also: `npm run visual-check` (render every screen state on the web build and diff it), `npm run e2e` (Maestro journeys), `npm run mockups:render` (V3 design files to text and PNG slices).

## Device validation

A manual GitHub Actions run renders every state on an iOS Simulator: `gh workflow run ios-simulator.yml`. How to run it and read the results: [docs/how-to/device-validation.md](docs/how-to/device-validation.md).

## Where to read more

- [docs/README.md](docs/README.md): which doc answers which question, current status, and a guide for coming back to the project
- [ARCHITECTURE.md](ARCHITECTURE.md): folders, layers, patterns, stack
- [DESIGN.md](DESIGN.md): design principles, token and accessibility rules
- [CONTRIBUTING.md](CONTRIBUTING.md): branches, commits, the gate, what never goes in git
- [CHANGELOG.md](CHANGELOG.md): what shipped and what is next
- [CLAUDE.md](CLAUDE.md): working rules for Claude Code sessions

## Licence

All rights reserved: the code is public to read, not licensed for reuse (see [LICENSE](LICENSE)). Security reports: [SECURITY.md](SECURITY.md).
