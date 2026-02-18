---
summary: "CLI reference for `shehzadalgo voicecall` (voice-call plugin command surface)"
read_when:
  - You use the voice-call plugin and want the CLI entry points
  - You want quick examples for `voicecall call|continue|status|tail|expose`
title: "voicecall"
---

# `shehzadalgo voicecall`

`voicecall` is a plugin-provided command. It only appears if the voice-call plugin is installed and enabled.

Primary doc:

- Voice-call plugin: [Voice Call](/plugins/voice-call)

## Common commands

```bash
shehzadalgo voicecall status --call-id <id>
shehzadalgo voicecall call --to "+15555550123" --message "Hello" --mode notify
shehzadalgo voicecall continue --call-id <id> --message "Any questions?"
shehzadalgo voicecall end --call-id <id>
```

## Exposing webhooks (Tailscale)

```bash
shehzadalgo voicecall expose --mode serve
shehzadalgo voicecall expose --mode funnel
shehzadalgo voicecall unexpose
```

Security note: only expose the webhook endpoint to networks you trust. Prefer Tailscale Serve over Funnel when possible.
