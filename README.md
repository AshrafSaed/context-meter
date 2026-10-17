# context-meter

A live **token and context meter** for [Claude Code](https://code.claude.com). It adds a colored status band above the prompt that shows how full your context window is, how much of your 5-hour and 7-day usage limits you have used, and how many tokens each turn and the whole session have spent. Near a limit, it holds heavy prompts and tells you to stop until the limit resets.

Engineering & Development: Ashraf Saed | MIGATRONIX

---

## What it shows

One line above the prompt, updated after every response:

```
ctx ████████░░░░░░░░ 52% used 104k · left 96k / 200k · turn 12k · session 340k  5h 62% ↻1h20m  7d 18% ↻71h5m
```

| Part | Meaning |
| --- | --- |
| `ctx ████░░ 52%` | How full the context window is (a bar and a percentage). |
| `used 104k · left 96k / 200k` | Tokens in the context now, tokens left, and the window size. |
| `turn 12k` | Tokens the last turn spent: new input + output + cache writes. Cache reads are not counted because they re-read the same context. |
| `session 340k` | The same count, summed over the session since the mod loaded. |
| `5h 62% ↻1h20m` | Share of the 5-hour usage window used, and time until it resets. |
| `7d 18% ↻71h5m` | Same for the 7-day window. Times are shown in hours and minutes. |

The status line also shows a short summary, for example `ctx 52% · max 62%`.

### Colors

Each meter is colored by how full it is:

- **Green**: below 60%
- **Yellow**: 60% to 84%
- **Red**: 85% and above

## Usage guard

The mod can hold a prompt before it is sent, so you do not burn through a limit by accident:

- At **97% or more** (context or any usage window), ordinary prompts are held. The message tells you to stop, and for a usage window it shows the time until the reset.
- At **90% or more**, only *heavy* prompts are held: prompts longer than 1,500 characters, or prompts with attachments.
- Slash commands (such as `/compact` and `/clear`) are never held.
- To send a held prompt anyway, start it with `!!`.

The thresholds are constants at the top of `hooks/register.tsx` (`HARD`, `SOFT`, `LONG_PROMPT`).

---

## Install

You need Claude Code and a Claude account that can use it.

### 1. Install Claude Code (skip if `claude --version` already prints a version)

macOS, Linux, WSL:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

The installer shows no progress while it downloads. When it finishes, open a **new** terminal window and check:

```bash
claude --version
```

If the shell says `command not found`, add the install folder to your PATH (macOS with zsh):

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
```

### 2. Sign in

```bash
claude
```

A browser window opens. Sign in and approve.

### 3. Install the mod

Inside Claude Code, at the prompt:

```
/plugin install context-meter --marketplace AshrafSaed/context-meter
```

1. When asked to add the marketplace, press `y`. (If nothing happens, switch your keyboard to English: on a non-English layout `y` types a different letter.)
2. When asked where to install, choose **Install for you (user scope)**. This makes the meter appear in every project.

The first message ends with `Installed context-meter. Plugin is now active.`

You can also install from a shell, without opening Claude Code first:

```bash
claude plugin install context-meter --marketplace AshrafSaed/context-meter
```

### 4. Check that it works

Send any message. After the reply, the meter line appears above the prompt. Before the first reply there is no data yet, so the line is hidden.

---

## Update and remove

Use Claude Code's `/plugin` menu (tabs **Installed** and **Marketplaces**) to update or remove the mod. See the [Claude Code plugin documentation](https://code.claude.com/docs) for the current commands.

---

## Files

```
.claude-plugin/plugin.json        mod manifest
.claude-plugin/marketplace.json   makes this repository an installable marketplace
hooks/hooks.json                  points to the hooks module
hooks/register.tsx                the meter, the colors and the usage guard
types/index.d.ts                  type contract for the values the mod keeps
```

## Notes and limits

- The meter shows what Claude Code reports. The percentage of the context window is the share the last response was answered over; its breakdown by category is an estimate.
- The usage windows (5h, 7d) appear only when Claude Code reports them for your account. Without them, only the context meter is shown.
- The guard cannot know in advance how many tokens a request will use. It estimates "heavy" only from prompt length and attachments.
- The session counter is a running total for the current Claude Code session, not an account-wide figure.
- The mod reads usage figures only. It does not send data anywhere.

## License

Add a license file of your choice before sharing this repository further.
