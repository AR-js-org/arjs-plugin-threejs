# Maintainers guide

Releases follow the shared process in
[AR.js-next's MAINTAINERS.md](https://github.com/AR-js-org/AR.js-next/blob/main/MAINTAINERS.md):
one milestone per version (`v0.2.0`), tracked on the
[AR.js-next roadmap](https://github.com/orgs/AR-js-org/projects/2) project, a
release issue from the "Release" template, and a tag pushed on `main`
**after** `dev` → `main` is merged, followed by re-syncing `dev` with
`git merge --ff-only origin/main`.

## Changelog

`CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
A PR with a user-visible change adds its entry under `## [Unreleased]`, so at
release time the section only needs checking and dating:

1. Check `## [Unreleased]` against the milestone's closed issues and merged
   PRs. Every breaking change is marked **Breaking** and says what consumers
   must change.
2. In the version-bump commit, rename it to `## [X.Y.Z] - YYYY-MM-DD` and add
   a new, empty `## [Unreleased]` above it.
3. Update the compare links at the bottom.

## What differs in this repository

- **Ship before the tracker when the event contract changes.** This plugin
  consumes `ar:marker*` payloads; when arjs-plugin-artoolkit changes them,
  release this side first, reading both old and new shapes.
- **npm publishing uses trusted publishing (OIDC)**, with no token
  (`publish.yml`, #16). It runs on the `v*.*.*` tag push, or by manual
  dispatch with an existing tag as its `tag` input; either way it checks out
  that tag and refuses one that disagrees with `package.json`. The trusted
  publisher on npmjs.com names organisation `AR-js-org`, repository
  `arjs-plugin-threejs`, workflow `publish.yml` and no environment.
- `release.yml` re-runs `build:types` after `npm run build` (which already
  ran it); harmless, but slower.

## Trusted publishing traps

- **Do not set `registry-url` on setup-node** in `publish.yml`. It writes an
  `.npmrc` with `_authToken=${NODE_AUTH_TOKEN}`; with no token npm believes
  auth is configured and never performs the OIDC exchange. npm's own example
  workflow includes it, so it is easy to reintroduce by copying the docs.
- **`publish.yml` must use Node 24.x**, stated in the workflow rather than
  read from `.nvmrc`. Trusted publishing needs npm ≥ 11.5.1, which Node 24
  ships; publishing must not depend on what `.nvmrc` says later.
- npm authorises per workflow **filename** and does not validate the trusted
  publisher configuration when it is saved. Renaming `publish.yml` breaks
  publishing silently until the next release.
- `package.json` `repository.url` must name this repository
  (`git+https://github.com/AR-js-org/arjs-plugin-threejs.git`): npm checks it
  against the provenance and rejects a mismatch with E422.

## Do not publish by hand

`dist/` and `types/` are built by the workflows. A manual `npm publish` works
but carries no provenance attestation. Do not commit them either: both are
gitignored, so never `git add -f` them into the version-bump commit.
