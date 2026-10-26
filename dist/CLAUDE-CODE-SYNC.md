# Claude Code ↔ Hoek Ribbon Studio

## Purpose
Use the private cloud planning workspace as the source of user requests, ideas, priorities and selected icons. Return repair reports without replacing the user's workspace. Revit binaries are built and installed separately.

Repository: https://github.com/adihoek-cmd/Hoek-Toolbar-Designer
App: https://adihoek-cmd.github.io/Hoek-Toolbar-Designer/dist/

## One-time setup and each work session
1. Clone or update the repository. Use Node.js 20+; no npm dependencies are needed.
2. In the repository root run `node tools/claude-bridge.mjs serve`. Keep it running.
3. Ask Adi to open the printed link in Chrome or Edge **on the same computer**, sign in to Ribbon Studio with the existing Google account, and click **חיבור לגשר המקומי** in the Claude Code panel. Allow browser local-network access if prompted. This deliberately requires a user click; do not automate approval.
4. Keep the app tab open while pulling/pushing. The bridge is session-based, not a background cloud service. It will not work from a phone on another computer or while the tab is suspended/closed. If local-network access is blocked, use the existing Publish export and repair-report import as fallback.
5. Run these commands in another terminal, in the same repository working directory:

```sh
node tools/claude-bridge.mjs pull claude-workspace
node tools/claude-bridge.mjs push path/to/hoek-repair-report.json
node tools/claude-bridge.mjs pull claude-workspace-after
```

`pull` reads the latest **cloud** revision, not unsynced edits on another device. Adi must wait for מסונכרן on the phone first. Pull before starting work and again before preparing the final report.

## What pull creates
- `workspace.json`: `cloudRevision`, `exportedAt`, full `state` and history.
- `state.nodes`: exact IDs, parent/group structure, labels, tooltips, notes, fix descriptions, priorities, statuses, source metadata and repair history. Ideas may be in the backlog or have idea status.
- `icons/`: selected embedded PNG/JPEG/WebP/SVG icons, decoded to files. Treat SVG files as artwork, not executable code.
- `icons.json`: maps exact nodeId to icon file and selected option. Use these selections in the Revit toolbar; filenames are not command IDs. If an icon has only a reference, resolve it from the repository's dist assets and do not silently substitute another.

Keep private workspace exports and `.hoek-bridge/` out of Git and out of public releases. The local pairing key permits local planning requests; do not paste it into public logs. No Firebase token, password, service-account key or admin credential is given to Claude. The app performs authenticated reads/writes under the existing owner-only Firestore rules.

## What to push
Push a `hoek-repair-report` v1 JSON file. Use exact **state.nodes[].id**, which may be a UUID different from source.id. Preserve the original notes/fix text from the snapshot used to implement the repair. Never claim a Revit runtime test when you only compiled or reviewed code.

```json
{
  "format": "hoek-repair-report",
  "version": 1,
  "reportId": "claude-code-UNIQUE-RELEASE-ID",
  "publishId": "",
  "packageVersion": "3.9.9",
  "generatedAt": "2026-10-25T12:00:00Z",
  "context": {
    "verificationPolicy": "Compiled successfully; runtime tests listed per item.",
    "sourcePublish": {"cloudRevision": 2},
    "installation": "Path to the separate installation package; no installation is performed by this report."
  },
  "items": [{
    "nodeId": "EXACT-ID-FROM-WORKSPACE",
    "result": "fixed",
    "originalNote": "Exact original notes value, or empty string",
    "originalFix": "Exact original fix value, or empty string",
    "claimedFix": "Concrete change, trigger and expected behavior",
    "testSteps": ["Steps Adi should perform in Revit"],
    "testsPerformed": ["What actually ran, model/version and result; or explicitly not run"],
    "remainingIssues": ["Known remaining limitations"],
    "changedFiles": ["src/path/File.cs"]
  }]
}
```

Replace all example values. `result` must be `fixed`, `partial`, or `not_fixed`. Arrays may be empty except a fixed item must include testSteps. Use an existing publishId only if the work actually corresponds to that saved Publish; otherwise leave it empty. Use a fresh reportId for new content. Retrying exactly the same report is safe and does not reset user verification. Unknown IDs or reports older than a tool's latest report reject the operation.

## Push semantics and verification
- The app reads the latest cloud snapshot, adds report entries and commits with a revision check. Concurrent changes cause a fresh read and safe retry, not a wholesale overwrite.
- Notes, priorities, selected icons, layout and user-added tools are preserved. The report includes the original request and the claimed change.
- `fixed` becomes **תוקן — יש לבדוק**. Only Adi can confirm passed/failed in the app. Partial/not-fixed reports do not claim a completed repair.
- Success returns `{revision, count, verified:true}` only after reading the cloud back. An exact duplicate returns `alreadyApplied:true`.
- After a timeout do a pull first; a write may have succeeded. Retry with the SAME reportId and identical content.
- Pull after push and verify every reportId is in the intended nodes' repairs. Include resulting cloud revision in the handoff.

## Scope of this connection
This version synchronizes planning data outward and repair reports plus actual Ribbon delivery snapshots inward. See RIBBON-DELIVERY.md for hoek-ribbon-delivery v1 and the same push command. It does not upload DLLs, install Revit, auto-replace user-selected icons, add arbitrary new tools or replace the full source Ribbon manifest. For a new release also prepare MANIFEST.json, toolbar.manifest.json, icons and the deploy package; supply them for the separate source-package update process. In the report include release metadata and all actual repaired commands. Do not update the app's package baseline merely because a report references a newer version.

## Completion checklist for Claude
1. Pull latest cloud workspace and record revision.
2. Implement requested fixes using exact command IDs and selected icons.
3. Test, distinguish compilation from actual Revit runs, record limitations.
4. Prepare deploy package plus repair report above.
5. Push report while the approved bridge is connected.
6. Pull again and verify cloud revision and report IDs.
7. Tell Adi what changed, what still needs testing, where the installer is, and the verified cloud revision.
8. Stop the bridge with Ctrl+C when finished; disconnect in the app.

## Actual Ribbon layout acknowledgment
Pull now includes planningSnapshot. Follow [RIBBON-DELIVERY.md](RIBBON-DELIVERY.md) to push the complete as-built layout with exact app IDs, order, source cloud revision and snapshot digest. This creates a separate delivered baseline and marks matching current plans as implemented without overwriting newer user edits. The previous paragraph about not replacing the full source manifest refers to installation/source migration, not this delivery comparison.


## Per-button version and concise change summary
For each changed button in actual.nodes, Claude MUST send both changedInVersion (e.g. "3.9.9") and changeSummary (1–500 characters, preferably one short Hebrew sentence describing the actual change). changedInVersion is the version where that specific change first shipped, and must not exceed packageVersion. Preserve these fields on unchanged buttons in subsequent full deliveries. Omit both only if no verified change history is known; never invent history. These fields appear in the button card and editor and do not affect layout matching.

For behavioral fixes, also push hoek-repair-report. Each changed item should include fixedInVersion and changeSummary alongside the full claimedFix, originalNote, originalFix and testSteps. fixedInVersion is the first version containing the fix; packageVersion is the reported package. Existing reports without these fields remain supported: the card displays packageVersion and an excerpt of claimedFix. A report never automatically marks a button tested/OK.

Example item additions: {"fixedInVersion":"3.9.9","changeSummary":"תוקן חישוב המידות ונשמר מיקום הכפתור בקבוצת התכנון."}. For actual.nodes use changedInVersion instead of fixedInVersion.
