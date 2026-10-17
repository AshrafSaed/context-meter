# context-meter

A Claude Code mod that shows, above the prompt, how full the context window is
(used / left tokens), the 5-hour and 7-day usage limits with time to reset, and
the tokens spent by the last turn and the whole session. Colors go green, yellow,
red. Near a limit it holds heavy prompts and tells you to stop until the reset
(start a prompt with `!!` to override).

## Install

At the prompt of a terminal session:

```
/plugin install context-meter --marketplace AshrafSaed/context-meter
```

From a shell:

```
claude plugin install context-meter --marketplace AshrafSaed/context-meter
```

Choose the **user** scope to have it in every project.
