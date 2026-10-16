# Local Design Workbench

A local companion for Claude Code on Amazon Bedrock. Generate HTML prototypes, wireframes and design systems, preview them in a browser, and export PDF or screenshot-based PowerPoint files. Inference remains with the provider configured in Claude Code.

This is Renato's security-focused fork of [crywolfe/claude-code-design](https://github.com/crywolfe/claude-code-design), based on commit `6fa5fd30f29444dcf8e38a5cc056df59ad6655af`. It is a review candidate, not installed or approved for confidential production use.

## What changes

- Preview server binds to 127.0.0.1 and serves only files within `artifacts/`. No directory listings, dotfiles or symlink escapes. Host-header validation rejects DNS rebinding.
- Preview response headers block external scripts, fonts, images, frames and form submissions. Scripts run in a sandboxed document.
- Exports block HTTP(S), WebSocket and FTP requests, retain Chromium's sandbox and restrict local-file requests to the artifact's directory.
- Export inputs and outputs are validated; existing files are preserved through exclusive writes.
- Workflow guards reject remote publishing, Git pushes and selected GitHub mutations. Publishing, design-system sync and remote ingestion skills are disabled.
- Dependency versions are locked, vulnerable image-size versions are overridden, and Chrome DevTools usage statistics are disabled.

## Introduction

Work in a dedicated project containing only reference material you intend Claude to use. Ask for a self-contained HTML prototype or wireframe, with local assets and system fonts. Generated work belongs under `artifacts/`.

Use `/serve` for the restricted preview. Open the explicit HTML path through `/preview`. Refine it through Claude Code, retaining a snapshot before major changes. PDF and PowerPoint exports stay inside `artifacts/`; use a new filename for every export. PowerPoint export uses slide screenshots and is not a substitute for native editable SKF decks.

External CDN-based React/Babel templates need conversion to local assets before they work. A blocked resource is a security boundary, not a reason to disable the controls.

## Review before installation

```sh
npm ci --ignore-scripts
npm audit
npm test
npm run test:browser
bash plugin/hooks/test-guard.sh
claude plugin validate ./plugin
```

The browser test uses an existing local Chrome installation. It only renders dummy content. To use a different installation, set `DESIGN_CHROME_PATH` to its executable.

Do not install the plugin globally yet. Its Bash hooks affect all Bash calls in a session. Its reference managed deny list needs review by the Claude Code administrator before sensitive use; this fork does not alter machine-wide managed settings, startup files, credentials or Bedrock configuration.

## Limits

These controls reduce risk; they do not create a complete operating-system sandbox. Claude Code's file tools still follow its own permissions. Browser engine vulnerabilities, newly discovered dependency flaws, malicious local assets and concurrent filesystem changes remain risks. Preview JavaScript retains same-origin access within the dedicated output folder. Never place unrelated confidential files there.

A plugin can be disabled or bypassed by the account owner; its hooks are not an administrator-managed enforcement boundary. Use only dummy or non-confidential material during evaluation. See [security review](docs/security-review.md).

## Licence

MIT; see LICENSE. Original implementation and attribution remain in Git history.
