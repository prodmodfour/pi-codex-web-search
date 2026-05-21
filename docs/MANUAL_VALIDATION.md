# Manual Validation

This file starts as a scaffold. Later tickets should expand it after the extension exists.

Manual validation requires:

* Pi installed
* Codex CLI installed
* `codex login` completed

Smoke test:

```bash
codex exec --search --skip-git-repo-check --sandbox read-only "Search the web for today's date. Return one sentence."
```

Do not commit logs containing private prompts, private paths, or secrets.
