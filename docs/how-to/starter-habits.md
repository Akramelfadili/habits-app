# Starter habits (development builds only)

Run the Expo dev server, open the app on your phone, and it already contains your own habits instead of whatever was there before. No button, no screen.

The list lives in `.env.local`, which git ignores. The repo is public and real habit names are personal, so they never go in a tracked file, a test, a doc or a commit message. The tracked `.env.local.example` shows the format with invented habits.

## Set it up

1. Copy `.env.local.example` to `.env.local`.
2. Replace the habits in the `EXPO_PUBLIC_STARTER_PROFILE` line with yours. It is one line of JSON inside single quotes.
3. Start Expo with a clean cache: `npx expo start --clear`. Expo reads `.env.local` when Metro starts and inlines the value into the bundle, so editing the file while the server runs, or restarting without `--clear`, can keep the old value.

## The format

```json
{
  "version": 1,
  "habits": [
    { "name": "Example stretch", "category": "Fitness", "perWeek": 3 },
    { "name": "Example reading", "category": "Learning", "target": { "amount": 15, "unit": "min" } }
  ]
}
```

| Field | Meaning |
|---|---|
| `version` | Whole number, 1 or more. See "Change the list" below. |
| `name` | Required, up to 32 characters, unique within the list. |
| `category` | Required, one of the ten built-in categories: Health, Fitness, Mindfulness, Productivity, Learning, Finance, Social, Home, Creativity, Other. A habit's icon and color come from its category, so this is how you pick them. |
| `perWeek` | Optional, 1 to 7 times a week. Leave it out for a daily habit. |
| `target` | Optional `{ "amount": 1-999, "unit": "min" }` for a counted habit (a unit of up to 20 characters). Leave it out for a simple check. |
| `reminders` | Optional list of `{ "hour": 8, "minute": 30, "weekdays": [1, 3, 5] }`. Leave `weekdays` out for every day. Nothing is scheduled for a habit without one. |

Habits are created in list order, as build habits, through the same functions the New habit form uses.

What the app cannot express: a habit that must be done "twice a day" as two separate checks (use a daily counted habit with target 2), a custom color or icon per habit (categories supply them), and a red category (there is none).

## What happens at startup

Only in a development build (`__DEV__`), after the database is ready and before the first screen:

1. If the variable is missing, nothing happens.
2. If it is not valid JSON or does not match the format, the app logs a warning (`dev.starter_profile.invalid`, with a reason code, never the content) and changes nothing.
3. If the stored marker (the `dev.starterProfile` setting) equals the profile's `version`, nothing happens, so changes you make in the app afterwards stay.
4. Otherwise, in one transaction: delete every habit and everything that hangs off them (check-ins, notes, freezes, reminders), create the profile's habits, mark First Run as seen so its screens are skipped, and store the new version in the marker. If any step fails, nothing is changed and `dev.starter_profile.failed` is logged.

App settings (theme, evening review time) and categories are kept. The success log, `dev.starter_profile.applied`, carries counts only.

## Change the list or re-apply it

- To replace the habits with an edited list, change `.env.local` and raise `version` (1 to 2). The next start wipes the app's habits and creates the new list. Any version different from the stored one re-applies.
- To reset to the same list (throw away what you logged), raise the version without changing the habits.
- To stop using it, delete the `EXPO_PUBLIC_STARTER_PROFILE` line. Your data stays as it is.

## Why it is development-only

- The root layout loads the feature with `__DEV__ ? require(...)`. In a production bundle `__DEV__` is false, so the bundler drops that branch, and the environment value, which Expo inlines only inside the gate file, goes with it.
- `check-architecture` rule `starter-profile-site` fails if anything else imports the gate, the service or the repository, if the root layout does not load the gate through `__DEV__ ? require(...)`, or if the variable name appears outside the gate. The rule has tests in `scripts/check-architecture.test.mjs`.
- `check-repo-hygiene` fails if any env file other than `.env.example` and `.env.local.example` is tracked.
- The `habitsapp://dev-state` hook used by device validation is a separate mechanism and is not touched.

Code: `src/modules/habits/dev/starter-profile.ts` (format and parsing), `repositories/starter-profile-repository.ts` (the transaction), `services/starter-profile-service.ts` (marker and logging), `screens/starter-profile-gate.tsx` (startup).
