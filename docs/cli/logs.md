---
summary: "CLI reference for `shehzadalgo logs` (tail gateway logs via RPC)"
read_when:
  - You need to tail Gateway logs remotely (without SSH)
  - You want JSON log lines for tooling
title: "logs"
---

# `shehzadalgo logs`

Tail Gateway file logs over RPC (works in remote mode).

Related:

- Logging overview: [Logging](/logging)

## Examples

```bash
shehzadalgo logs
shehzadalgo logs --follow
shehzadalgo logs --json
shehzadalgo logs --limit 500
shehzadalgo logs --local-time
shehzadalgo logs --follow --local-time
```

Use `--local-time` to render timestamps in your local timezone.
