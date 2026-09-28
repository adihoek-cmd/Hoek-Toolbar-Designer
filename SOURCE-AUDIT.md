# HoekAI 3.9.3 package audit

The baseline was extracted from the ZIP attached to the referenced ChatGPT conversation. The referenced `/mnt/data/` path was not present on this Windows host; the conversation attachment resolved to a local copy of the same named archive.

## Ribbon sources inspected

- `toolbar/toolbar.manifest.json`: six panels, 38 commands/prompts, seven stacks, one dropdown, two separators. Labels, order, tooltips, command classes, params, prompt text and targets are preserved in `dist/source-manifest.json` and each seed node's `source` field.
- `src/HoekAI.Ribbon/RibbonApp.cs`: calls RibbonBuilder at startup.
- `src/HoekAI.Ribbon/RibbonBuilder.cs`: reads office manifest, local fallback and optional per-user overrides. Handles command, prompt, stack and pulldown, uses 64px icons with 32px fallback and 16px for small items. Prompt slots are limited to 12. Stacks show only the first three items. Separators are supported inside pulldowns.
- `build/src/bridge/ClaudeRevitPlugin.cs`: separately creates the `Hoek AI Tools` panel on the same `Hoek AI C2R` tab and binds `HoekAIStatus` to `ClaudeRevitPlugin.ShowServerStatusCommand`. Its original HoekLogo is included.
- `toolbar/make_icons.py`: documents original near-black navy `#0D1021` and plum `#6B317F`. These colors informed the planner; no package scripts were executed.

## Imported inventory

| Panel | Tools |
|---|---:|
| Hoek AI Tools (bridge) | 1 |
| Model | 6 |
| Apartments | 9 |
| Annotate | 3 |
| Lists | 8 |
| Mamad | 1 |
| Export & QC | 11 |
| Total | 39 |

The seven-panel ordering includes the bridge panel first, followed by manifest panel order. Relative ordering of separately loaded add-ins depends on Revit startup and was not verified in a live Revit installation. The planner defaults to the Model panel; All panels shows the entire package baseline.

The ZIP cannot reveal station-specific office manifest changes or per-user overrides. No commands were executed in Revit, and source claims about previous validation were not translated into planner test statuses. All tools begin as needs-testing.

Icons are original package PNGs, not regenerated illustrations. Stack container names are generated display labels because the source stacks have no names or IDs. Source separators remain explicit nodes. The planner is a design and tracking tool, not a live Revit extension or automatic installer.
