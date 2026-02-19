---
summary: "CLI reference for `shehzadalgo agents` (list/add/delete/set identity)"
read_when:
  - You want multiple isolated agents (workspaces + routing + auth)
title: "agents"
---

# `shehzadalgo agents`

Manage isolated agents (workspaces + auth + routing).

Related:

- Multi-agent routing: [Multi-Agent Routing](/concepts/multi-agent)
- Agent workspace: [Agent workspace](/concepts/agent-workspace)

## Examples

```bash
shehzadalgo agents list
shehzadalgo agents add work --workspace ~/.shehzadalgo/workspace-work
shehzadalgo agents set-identity --workspace ~/.shehzadalgo/workspace --from-identity
shehzadalgo agents set-identity --agent main --avatar avatars/shehzadalgo.png
shehzadalgo agents delete work
```

## Identity files

Each agent workspace can include an `IDENTITY.md` at the workspace root:

- Example path: `~/.shehzadalgo/workspace/IDENTITY.md`
- `set-identity --from-identity` reads from the workspace root (or an explicit `--identity-file`)

Avatar paths resolve relative to the workspace root.

## Set identity

`set-identity` writes fields into `agents.list[].identity`:

- `name`
- `theme`
- `emoji`
- `avatar` (workspace-relative path, http(s) URL, or data URI)

Load from `IDENTITY.md`:

```bash
shehzadalgo agents set-identity --workspace ~/.shehzadalgo/workspace --from-identity
```

Override fields explicitly:

```bash
shehzadalgo agents set-identity --agent main --name "ShehzadAlgo" --emoji "🦞" --avatar avatars/shehzadalgo.png
```

Config sample:

```json5
{
  agents: {
    list: [
      {
        id: "main",
        identity: {
          name: "ShehzadAlgo",
          theme: "space lobster",
          emoji: "🦞",
          avatar: "avatars/shehzadalgo.png",
        },
      },
    ],
  },
}
```
