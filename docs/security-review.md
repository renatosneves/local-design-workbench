# Security review — 16 October 2026

## Scope

Local Design Workbench, forked from crywolfe/claude-code-design at 6fa5fd30f29444dcf8e38a5cc056df59ad6655af. Reviewed workflow hooks, local previews, export scripts, plugin metadata and dependency inventory. No malware certification or comprehensive penetration test is claimed.

## Checks

- npm dependency audit: zero known vulnerabilities after lockfile refresh and image-size override.
- Plugin manifest validates with the non-reserved name local-design-workbench.
- Regression tests cover file containment, symlink escape, existing-output preservation, Host-header validation, directory listing, traversal and remote mutation rejection.
- Real Chromium test confirms local rendering and PDF generation; attempted HTTP, image and popup exfiltration produces zero requests at the trap server.
- Upstream guard matrix retained with expectations updated for deliberately disabled remote ingestion, Git pushes and generic HTTP serving.

## Residual risks and evaluation conditions

The restrictive server is not a full OS sandbox. Browser hooks cannot guarantee isolation from all engine flaws. Same-origin scripts can access other deliberately served output files. No SKF data, credentials or personal vault content should enter this evaluation workspace.

The plugin guard has session-wide effects. Keep evaluation in a dedicated project, do not deploy its reference managed settings machine-wide without separate review, and do not enable bypass permissions. Host response headers apply only to the restricted server; opening generated HTML elsewhere changes the trust boundary.

Only existing local Chrome and dummy data were used. The fork is uninstalled. Native Anthropic sharing and remote data ingestion are disabled; any future deployment, integration or publishing route requires its own review.
