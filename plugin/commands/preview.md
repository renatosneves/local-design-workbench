---
description: Open a restricted offline preview.
argument-hint: <http://127.0.0.1:port/file.html>
allowed-tools: mcp__chrome-devtools__navigate_page
---

Use /serve first. Navigate only to an explicit HTML file on the restricted preview server. Do not open file:// or external URLs. Use self-contained HTML with bundled local assets. Never expose the project root or bypass its response headers.
