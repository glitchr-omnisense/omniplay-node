# Changelog

## [Unreleased]

## [1.0.0] - 2026-11-13

The first release (the 0.1.0 prepared before was never published).

### Added
- `@omniplay/node`: `verify`, `sign`, `signJson`, `mint`, `encodeJson` (JSON as PHP's
  `json_encode()` writes it), `heartbeatToken`, `sendHeartbeat`, `startHeartbeat`, `fromEnv`, with
  their types. Checked against omnisense/omniplay 1.0.0's vectors (5 signed, 22 verified).
- `examples/first-call.mjs`, the README's first call, run by the tests.
- CI on Node 20, 22 and 24 (tests and the tarball's content); a release workflow on a tag (GitHub
  release, `npm publish --provenance` when the repository holds `NPM_TOKEN`).
- Node 20 or later (`engines`); `exports` gives `.` and `./package.json`.
