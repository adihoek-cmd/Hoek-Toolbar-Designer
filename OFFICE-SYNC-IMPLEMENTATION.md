# Office shared workspace — implementation branch

**Status: IMPLEMENTED LOCALLY; NOT DEPLOYED.** See [OFFICE-DEPLOYMENT.md](OFFICE-DEPLOYMENT.md) for implementation, tests, exact blockers and release gates. The original requirements/checklist below remain the acceptance criteria. Existing personal sync remains live on main.

## Requirements confirmed
- Owner/admin: adih@hoek.co.il. Identity must be verified through Firebase Authentication and bootstrapped with Firebase Admin SDK; email string alone is not authorization.
- Admin generates a single-use invitation link, valid for 24 hours, for one specified email address; admin shares it via Slack/WhatsApp.
- Invitee authenticates with Google or verified email/password, with email matching the invite. Token must be cryptographically random, stored only as a hash server-side, and redeemed atomically.
- Every active office member accesses the same workspace. Admin may revoke membership.
- Every accepted change records server time, Firebase UID, verified email, action, affected node IDs, before/after values, and workspace revision. Audit records are append-only.
- Preserve offline local drafts, but block unauthorized cloud reads/writes and surface unsynced/conflict states clearly.

## Existing implementation reviewed
- dist/cloud-store.js currently stores data at users/{uid}/workspaces/main and commits with Firestore client transactions.
- dist/cloud-ui.js already provides initial-publish, cloud join, and three-way merge.
- dist/app.js saves to IndexedDB/localStorage. Its cloud snapshot includes state and history.
- Existing cloud configuration is live; **never replace its security rules with permissive rules**.

## Mandatory deployment sequence
1. Export the current desktop workspace JSON, including the pending retest repairs, and separately export the phone workspace. Verify both backups.
2. Obtain Firebase project admin/deploy permissions. Configure Google and email/password providers, authorized GitHub Pages domain, Cloud Functions, and email verification.
3. Implement privileged callable functions: createInvite, redeemInvite, revokeMember, readWorkspace, commitWorkspace, listAudit. Bootstrap the first admin by verified UID through an admin-only script; reject arbitrary self-registration.
4. Store office workspace at offices/hoek/workspaces/main with immutable revision documents; commitWorkspace must atomically compare expected revision, validate membership, write the new version and append audit entries. Audit identity/time must be computed server-side, never supplied by the browser. Enforce payload and diff size limits.
5. Implement admin invitations UI, login/register, acceptance page, member management, and per-user audit viewer. Never expose an invite token in application logs.
6. Adapt existing cloud UI to the office path and server callables, preserve three-way merge, protect the initial migration so only the admin may publish the authoritative desktop copy.
7. Deploy tested rules that permit only appropriate authenticated member reads and deny all client writes to workspace, invitations, memberships, and audit collections. Existing personal rules must be migrated deliberately.
8. Test: uninvited denial; wrong email; expired/used link; revoked account; concurrent edits; offline conflict; audit tampering; phone/desktop sync; service-worker update; backup/restore.
9. Only after passing tests, deploy and announce cutover. Keep the legacy data as a read-only backup until verification.

## Why not flip a path in client code?
Changing users/{uid} to a shared path without server-side authorization would expose all office plans to anyone able to call Firestore. Browser-side audit records are forgeable. Firebase configuration alone is not a secure membership system.
