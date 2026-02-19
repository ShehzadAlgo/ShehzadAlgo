---
summary: "CLI reference for `shehzadalgo config` (get/set/unset config values)"
read_when:
  - You want to read or edit config non-interactively
title: "config"
---

# `shehzadalgo config`

Config helpers: get/set/unset values by path. Run without a subcommand to open
the configure wizard (same as `shehzadalgo configure`).

## Examples

```bash
shehzadalgo config get browser.executablePath
shehzadalgo config set browser.executablePath "/usr/bin/google-chrome"
shehzadalgo config set agents.defaults.heartbeat.every "2h"
shehzadalgo config set agents.list[0].tools.exec.node "node-id-or-name"
shehzadalgo config unset tools.web.search.apiKey
```

## Paths

Paths use dot or bracket notation:

```bash
shehzadalgo config get agents.defaults.workspace
shehzadalgo config get agents.list[0].id
```

Use the agent list index to target a specific agent:

```bash
shehzadalgo config get agents.list
shehzadalgo config set agents.list[1].tools.exec.node "node-id-or-name"
```

## Values

Values are parsed as JSON5 when possible; otherwise they are treated as strings.
Use `--json` to require JSON5 parsing.

```bash
shehzadalgo config set agents.defaults.heartbeat.every "0m"
shehzadalgo config set gateway.port 19001 --json
shehzadalgo config set channels.whatsapp.groups '["*"]' --json
```

Restart the gateway after edits.
