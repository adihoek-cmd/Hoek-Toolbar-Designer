# Hoek Studio — team proposals

## What ships
- `dist/team.html`: email-link login, an approved shared snapshot, personal proposals and local draft; owner-only email allowlist, pending queue, approve/reject and publication.
- Team documents: `teams/hoek`, `members/{lowercase-email}`, `published/current`, `proposals/{uuid}`.
- The existing `users/{uid}/workspaces/main` remains owner-only. Members cannot read its private notes/history or write to it.
- Approval is one Firestore transaction: read the latest canonical revision, reject conflicting fields, create a canonical revision and mark the proposal approved. Repeated approvals fail. Rejection does not modify the canonical workspace.
- Sharing is explicit: owner publishes the latest cloud plan to the team; private notes, fixes and reports are omitted. After approving proposals, publish again for the team to see them. The main Studio receives the approved canonical revision through its existing synchronization.
- Proposal support: button title/description/priority, raster icon, position, comments, new backlog ideas. Group creation/deletion and bulk layout edits remain owner actions.

## Required before inviting anyone
1. Test `firestore.rules` with the Firebase emulator and the supplied tests. Do not make the private workspace publicly readable.
2. Deploy the reviewed Firestore rules to `hoek-ribbon-studio`.
3. In Firebase Authentication → Sign-in method, enable Email/Password and **Email link (passwordless sign-in)**. This app uses email links, not numeric OTPs. Keep Google sign-in for the owner. Authorize `adihoek-cmd.github.io` and the existing Firebase auth domain.
4. Publish the web files and service-worker cache update. Open `dist/team.html` as the owner, publish the shared view, then add permitted emails.
5. A member opens the same team URL and requests a link to their own email. Clicking that link proves email ownership; access still requires an active allowlist record. A link must not carry the email address in its URL. On another device, the user enters the same email to complete sign-in.
6. Test with a real invited account and an uninvited account: read shared plan; submit an edit; verify owner workspace unchanged; approve as owner; verify one new canonical revision; reject another; revoke access and verify new reads/writes fail.

## Limits and operations
- Firebase sends the authentication email; no custom mail server or service-account key is embedded. Email-link delivery is subject to the project's Firebase quotas and provider configuration. Do not claim invitations were emailed merely because an allowlist record was created.
- The shared view requires online authentication; only the member's unfinished proposal is kept locally. Revocation blocks subsequent requests but cannot erase information already seen or saved.
- Proposal submission must use the current shared revision. An older saved draft is not silently rebased. Private owner edits after submission are checked again inside the approval transaction.
- A shared snapshot contains at most the fields explicitly listed in `sharedSnapshot`, never the whole backup. Local proposal drafts are keyed by user UID; signing out clears the visible workspace.
- Up to 100 pending proposals are shown at once. Handle and refresh for subsequent items. Members see up to 100 of their own proposals.
- Keep private exports, actual member lists and Firebase credentials out of Git. Security rules—not a hidden URL—enforce authorization.
