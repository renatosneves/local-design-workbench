---
description: Start an offline preview restricted to artifacts.
argument-hint: [port]
allowed-tools: Bash(python3:*)
---

Run `python3 "${CLAUDE_PLUGIN_ROOT}"/scripts/secure-preview.py 4567` in the background from the project root. Only files under artifacts are served. Open an explicit HTML filename; directory listings return 403. External fonts, libraries, frames and network requests are blocked. Use local dependencies.
