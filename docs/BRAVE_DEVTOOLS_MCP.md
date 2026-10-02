# Brave DevTools MCP Setup

Chrome DevTools for agents is officially stable and provides an MCP server for browser automation, console/network inspection, screenshots, Lighthouse/performance traces, memory tools, and related DevTools workflows.

Nova64 uses Brave through a remote debugging port because `chrome-devtools-mcp` officially supports Chrome/Chrome-for-Testing, while Brave is a Chromium browser that may work but is not guaranteed by the upstream project.

## Start Brave

From WSL:

```bash
cd /mnt/c/Users/brend/exp/nova64
./scripts/start-brave-devtools.sh
```

The script starts Brave at `http://127.0.0.1:9222` with a separate temporary profile:

```text
C:\Users\brend\AppData\Local\Temp\nova64-brave-devtools-profile
```

Set `BRAVE_EXE`, `BRAVE_DEVTOOLS_PORT`, or `BRAVE_DEVTOOLS_PROFILE_DIR` before running the script if the defaults do not match the machine.

## MCP Wrappers

Codex calls the WSL wrapper configured in `~/.codex/config.toml`:

```bash
/mnt/c/Users/brend/exp/nova64/scripts/chrome-devtools-mcp-brave.sh
```

Claude is configured user-wide with:

```bash
cmd.exe /c C:/Users/brend/exp/nova64/scripts/chrome-devtools-mcp-brave.cmd
```

Both paths bridge to Windows `npx`, then run:

```bat
npx -y chrome-devtools-mcp@latest --browser-url=http://127.0.0.1:9222 --no-usage-statistics --no-performance-crux
```

The browser must be started first with `scripts/start-brave-devtools.sh`.

## Validation Prompt

After restarting Codex or Claude so MCP servers reload, ask:

```text
Use chrome-devtools to open http://127.0.0.1:5173/console.html and take a screenshot.
```

For a generic upstream smoke test:

```text
Check the performance of https://developers.chrome.com
```

## Security

The MCP server can read and control any page in the debug-enabled Brave profile. Keep the debug profile separate from normal browsing and do not sign into sensitive accounts there unless intentionally handing that session to the agent.
