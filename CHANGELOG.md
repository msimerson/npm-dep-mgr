# Changelog

### Unreleased

### [2.0.1] - 2026-03-31

- fix: optional dependency support

### [2.0.0] - 2026-03-18

- deps: removed all but semver
  - deps(semver): updated to v7
  - deps(concat-stream): refactored it away
  - deps: replaced bluebird with native promises
  - deps: dropped jasmine
  - deps: refactored out spawn-shell
- fix: normal log messages to stdout (not stderr)
- test: replaced jasmine with node --test
- test: added a couple E2E tests
- remove package-lock.json from repo

### 1.2.0 -

- feat: support optional dependencies
- deps: bump versions that don't break stuff

### 1.0.2 - 2024.04.04

- also check [optional](https://docs.npmjs.com/cli/v9/commands/npm-install) dependencies

### 1.0.1 - 2019.06.26

- fix: custom (non-semver) tags in history were breaking the whole check. Currently they are omitted and only debug is pasted (when on --verbose) in the console.

### 1.0.0 - 2019.05.19

#### Changed

- CLI entry `check-dep-versions` was changed to `dep-versions` and work with commands `dep-versions check` and `dep-version update`.
- Multiple flags were changes, see `--help` for command you want to use.

#### Added

- `dep=versions update` command to save the updates in package.json.
- `dep-versions check` perform self-check (use `--no-self-check` to omit it).
- `--silent` to hide everything that's not table with results.

[0.3.1]: https://github.com/msimerson/npm-dep-mgr/releases/tag/v0.3.1
[1.0.0]: https://github.com/msimerson/npm-dep-mgr/releases/tag/v1.0.0
[1.0.0-0]: https://github.com/msimerson/npm-dep-mgr/releases/tag/v1.0.0-0
[1.0.0-1]: https://github.com/msimerson/npm-dep-mgr/releases/tag/v1.0.0-1
[1.0.1]: https://github.com/msimerson/npm-dep-mgr/releases/tag/v1.0.1
[1.1.0]: https://github.com/msimerson/npm-dep-mgr/releases/tag/v1.1.0
[1.1.2]: https://github.com/msimerson/npm-dep-mgr/releases/tag/v1.1.2
[1.2.0]: https://github.com/msimerson/npm-dep-mgr/releases/tag/v1.2.0
[2.0.0]: https://github.com/msimerson/npm-dep-mgr/releases/tag/v2.0.0
[2.0.1]: https://github.com/msimerson/npm-dep-mgr/releases/tag/v2.0.1
