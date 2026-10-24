# Personal sync on Firebase Spark — published

Published on 24 October 2026 after explicit user approval. Production commit: `482170ba7e2f3557e2e01bbce43779f48d04e479`. [Successful Pages deployment](https://github.com/adihoek-cmd/Hoek-Toolbar-Designer/actions/runs/40091954610). All five deployed static files were fetched from the live /dist/ URL and matched the tested source exactly. The live service worker updater completed successfully with build `hoek-542dcf484f29`. Firebase billing, Auth settings, security rules and stored workspace data were not changed by the release.

Decision: one verified Google user, `adi.hoek@gmail.com`, on multiple machines. Keep Firebase Spark and do not enable billing. The requested office/team rollout is superseded.

## Final behavior

- Uses the existing `users/{uid}/workspaces/main` and immutable version documents. No migration or path switch is needed; current desktop/phone metadata remains compatible.
- Google login, offline device drafts, three-way merge, explicit conflicts, previous-version downloads and local recovery copies remain available.
- The account shown in the app is the existing verified personal owner. The active production rules already enforce its verified email and UID.
- Only the small head is watched for changes. There is no 15-second office polling. Repeated reads of the same authorized head reuse its immutable payload; a changed head downloads the new revision. Every read still checks server authorization.
- No invitations, team membership UI, server-generated office audit or Cloud Functions are used by the app. Office backend source is retained as inactive development history, not part of this release's deployment.

## Evidence and data preservation

On 24 October 2026, Firebase Console confirmed project Owner access, Spark billing, Google enabled, the GitHub Pages domain authorized, and Firestore in me-west1. The published rules restrict existing personal data to the verified Gmail owner. Nothing in Firebase billing, Auth, rules or data was changed.

A read-only copy of live revision 1 was saved and JSON-validated locally at `backups/production-review/legacy-cloud-revision-1.json` (ignored by Git): 50 tools, 9 pending retests, 120 history entries and embedded icons. Raw device drafts may be newer; the cloud backup is not a substitute for independent phone/desktop exports.

The release changes only static app files. The existing production Firestore rules do not need deployment. `firestore.office.rules`, `firestore.production.rules`, all office functions and billing upgrades must NOT be deployed for this personal release.

## Validation and release

Run `npm test`, `node verify-cloud.mjs`, `node verify-sync.mjs`, `node verify-repairs.mjs`, `npm run test:emulator`, then `node prepare.mjs`.

The combined-rule emulator tests prove successful legacy atomic writes, owner-only reads and immutable personal revisions. The coordinator tests prove two devices, offline edits, conflicts, in-flight edits and concurrent revision retries. The store test proves unchanged-payload caching cannot cross identities or bypass authorization.

Browser verification succeeded against the real project: Google sign-in reached the existing workspace's explicit first-connection choice. No cloud copy was imported or published during verification. A previously cached office preview updated to the personal UI after the new service worker activated and the page reloaded.

After user approval, publish the tested development branch through the manual GitHub Pages workflow (static files only). Do not merge unrelated office server configuration into a production deployment. Preserve the previous Pages artifact for rollback. Verify the site/service worker update and a server read of the existing revision before asking the user to refresh other devices.

On another device, use the same Google account. Export any newer local work before choosing the initial cloud copy. A real phone/desktop two-way test still requires those devices and must not be claimed based only on emulators.
