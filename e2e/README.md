# E2E journeys (Maestro)

Nine full user journeys (three of them unverified until the next simulator pass, see the doc below), one YAML file each, named by the feature IDs they cover. They drive Maestro's **web** driver against `expo start --web` with in-memory fixtures and a pinned clock.

```sh
npm run e2e                                  # every journey
npm run e2e -- e2e/hab-12-reminders.yaml     # one
```

The journey table, last-run status, coverage gaps, setup (Maestro, JDK), what the web driver cannot do and the manual device checks: `docs/how-to/e2e.md`.
