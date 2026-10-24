# Office workspace: implementation and release gate

Status: local implementation; NOT deployed. Branch: `feature/office-shared-workspace`.

## Implemented

- Fixed office `offices/hoek`, with shared head `workspaces/main` and immutable version documents.
- Eight authenticated callable functions; verified Google or password identity, live Auth account checks, and transactional membership checks. Client-supplied roles and audit identities are ignored.
- Admin-only, email-bound random 256-bit invitations; only SHA-256 hashes stored, 24-hour expiry, atomic single redemption. Revocation invalidates invitations issued before revocation; a new admin invitation can restore access.
- Admin membership management, verified password registration/login/reset, Google login, fragment-based invitation acceptance, paginated audit viewer with optional UID filter.
- Every accepted workspace revision, invitation creation/redemption, membership revocation and admin bootstrap has a server-side audit record. Workspace records include actor UID/email, server time, revision, changed node IDs (including deletion), and before/after values. Browser history is untrusted payload; the server audit is authoritative.
- Transactional expected-revision comparison, existing three-way merge/conflict UI, offline drafts and a 15-second polling interval. Office metadata is namespaced separately from legacy personal metadata.
- Initial publication requires an explicit device choice and admin membership. Existing office data cannot be initialized again at revision zero. The browser creates a durable IndexedDB recovery copy before joining or publishing. Existing personal cloud documents are never written by office code.
- Payload limit 700KB, bounded audit differences; too-large requests fail atomically and keep local drafts.
- Versioned service worker contains the office modules and bundled authentication SDK.

## Local verification

```
npm ci
npm ci --prefix functions
npm test
node verify-cloud.mjs
node verify-sync.mjs
npm run test:emulator
```

The emulator script requires Java 21+. It always uses `demo-hoek-office`, never the production project. Emulator tests execute real Auth, Functions and Firestore, including authenticated REST attacks against head, membership, invites, versions and audit documents. Unit tests inject a serialized transaction adapter; those tests alone are not evidence of real Firestore behavior.

Existing `verify-repairs.mjs` also passes. Existing `verify-package.mjs` cannot run on this PC: its external fixture `../Hoek-Claude-Handoff-Approved-2026-09-29/reviewed-phone-backup.json` is absent. Do not substitute the repository seed or claim actual user backup verification.

For browser QA only, start the same emulators, run `node serve.mjs`, and open `http://localhost:4173/?officeEmulator=1`. The switch is accepted only on a loopback hostname and uses the demo project. All test accounts/data are disposable emulator data. Never enter a production password in the demo.

## Production blockers and mandatory sequence

1. Firebase CLI is installed locally. `projects:list` currently fails with **Failed to authenticate, have you run firebase login?** No standard CLI auth file or gcloud was found. Browser/app login in the other chat is not evidence of project administration permission on this PC. Sign in locally; do not copy authorization codes, tokens, passwords or service-account keys into chat or Git.
2. After authentication, read project IAM permissions, Auth providers/authorized domains, billing/functions availability, active Firestore rules and indexes. These have NOT been verified. Record/export the active rules before preparing an exact combined rules change.
3. **Do not deploy `firestore.office.rules`.** It deliberately denies everything, including legacy paths, and is used only in isolated tests. Production `firebase.json` intentionally has NO Firestore rules or indexes deployment target. An office deny block cannot neutralize an overlapping permissive wildcard: Firestore matching allows are ORed. Review every deployed match before adding office protection. Preserve the deployed legacy policy until a separately approved read-only cutover; never guess the legacy permissions.
4. Prepare combined production rules that deny all direct client access to office data while retaining the reviewed legacy behavior. All office access is through callables. Merge `firestore.office.indexes.json` into the existing index set without deleting existing indexes. Validate the combined policy in an emulator before requesting release approval.
5. Export and verify both the actual desktop and phone backups (node counts, notes, icons, statuses, and nine retest repairs). The local checkout seed is NOT the user's desktop data. Keep original JSON files and the legacy `users/{uid}/workspaces/main` revisions. No real device backup has been migrated by this implementation.
6. Obtain explicit user approval for the exact production functions/rules/indexes/site release and initial admin creation. No production deploy, bootstrap, migration or deletion has been performed here.
7. Bootstrap `adih@hoek.co.il` by its verified Firebase UID using `functions/bootstrap-admin.mjs`. It requires Application Default Credentials with appropriate project permissions (CLI login alone does not provide ADC). Provision ADC interactively on the PC; do not export keys. The script requires `VERIFIED_UID --approve-production-write`, refuses a mismatched/unverified/disabled account and existing membership, and appends an audit event atomically.
8. Deploy approved server changes and combined rules/indexes, then the site. The repository Pages workflow is manual; pushing this branch does not publish it. Functions endpoint region is `us-central1`; check required APIs and regional availability before release.
9. On the actual desktop at the existing production site origin, export a backup and explicitly publish the authoritative local copy as admin. Do not import over the device state. On the phone export its independent backup before joining, compare/merge outstanding local edits, then verify both directions with two real member accounts, Google and verified password login, revocation, offline conflict resolution, audit and service-worker upgrade. A real Google OAuth popup and real phone/desktop acceptance have NOT been verified by emulator tests.

## Rollback and limits

Keep the previous static release and exported deployed rules. Office functions never modify legacy personal documents. Rollback should restore the prior site and its reviewed rules, leaving office revisions/audit intact for investigation; do not delete data. Access revocation prevents future server access but cannot erase copies already downloaded to an offline device. Project IAM administrators can modify server data; append-only here means no client or exported application function can rewrite/delete audit records.
