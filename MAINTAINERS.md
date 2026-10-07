# Maintainers guide

Releases follow the shared process in
[AR.js-next's MAINTAINERS.md](https://github.com/AR-js-org/AR.js-next/blob/main/MAINTAINERS.md):
one milestone per version (`v0.2.0`), tracked on the
[AR.js-next roadmap](https://github.com/orgs/AR-js-org/projects/2) project, a
release issue from the "Release" template, and a tag pushed on `main`
**after** `dev` → `main` is merged, followed by re-syncing `dev` with
`git merge --ff-only origin/main`.

## What differs in this repository

- **Ship before the tracker when the event contract changes.** This plugin
  consumes `ar:marker*` payloads; when arjs-plugin-artoolkit changes them,
  release this side first, reading both old and new shapes.
- **npm publishing uses the `NPM_TOKEN` secret** (`publish.yml`, with
  `registry-url` set on setup-node). It runs on the `v*.*.*` tag, or by
  manual dispatch with `publish: true`. The dispatch `tag` input is currently
  unused, so a manual run publishes whatever ref it was dispatched from:
  dispatch it **from the tag**, not from a branch.
- `publish.yml` runs `build:types || true`, so a failed declaration build
  does not stop a publish. Check `types/` in `npm pack --dry-run` output.
- `release.yml` re-runs `build:types` after `npm run build` (which already
  ran it); harmless, but slower.
