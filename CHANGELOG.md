# Changelog

All notable changes to this project should be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- Canonical status tracking in `docs/reference/MARKETPLACE_STATUS_AND_TODO.md`
- Canonical roadmap gate model in `docs/ROADMAP.md`
- Root `CHANGELOG.md` to align with repo best-practice guidance
- Repo-wide best-practices audit in `docs/reference/BEST_PRACTICES_AUDIT.md`
- `specs/README.md` and `specs/repo-best-practices-audit.md`

### Changed
- Restored richer root and docs-index formatting while updating project status to match the current codebase
- Updated roadmap to separate working, partial, and planned work and to prioritize stabilization first
- Updated README and docs index to point readers to the status doc and changelog as truth sources
- Expanded `.claudeignore` to better match binary-file handling guidance
- Updated canonical docs after the full Jest baseline turned green (`40/40` suites, `517` passing tests, `2` skipped)

### Fixed
- Documentation drift where implemented features were still described as missing or purely roadmap items
- Greened the previously failing Jest baseline by fixing callback/promise DB helper compatibility, normalizing Jest `axios` resolution, and updating stale route/test harness coverage for checkout, webhook, download, email tracking, and Lulu POD tests
