# npm-dep-mgr

## Motivation

You should have a wicked fast and lightweight tool for checking dependency versions and keeping them up-to-date.

## Disclaimer

- Tags are in semver, if they do not parse semver they do not show.

## Installation

`npm install -g npm-dep-mgr`

Or don't install it, I don't. It gets installed "on demand" via NPM scripts in my package.json only when I want to run it:

```json
{
  "scripts": {
    "versions": "npx npm-dep-mgr check",
    "versions:fix": "npx npm-dep-mgr update"
  }
}
```

## Usage

Run in your project (you do not need to be exactly in root):

```sh
npm-dep-mgr --help
npm-dep-mgr check [rule] //checks dependencies and prints them in table
npm-dep-mgr update [rule] //checks dependencies and update them in package.json
```

### Rule parameter

- Rule parameter is a string by which successful match against the dependencies.
- Rule parameter may be omitted, but check will be executed against all the dependencies.

#### Checking

```sh
$ npm-dep-mgr check sem
Checking dependencies in: /Users/matt/git/dependency-version-checker/package.json.
	matching this regex: /sem/.

Dependency  Type  Current Version  Latest Minor  Latest Major  Changed to
==========  ====  ===============  ============  ============  ==========
semver      Prod  7.0.0            7.7.4         -
```

#### Updating

```sh
$ npm-dep-mgr update sem
Updating dependencies in: /Users/matt/git/dependency-version-checker/package.json.
	matching this regex: /sem/.

Dependency  Type  Current Version  Latest Minor  Latest Major  Changed to
==========  ====  ===============  ============  ============  ==========
semver      Prod  7.0.0            7.7.4         -             7.7.4

Remember to run 'npm install' to install the dependencies.
```

#### Debugging

Run `npm-dep-mgr <command> --help` to see additional flags.

## History

- Forked from [https://github.com/tmakuch/dependency-version-checker](https://github.com/tmakuch/dependency-version-checker) in 2026 when it was abandoned.
  - Ripped out all the dependencies except semver
  - refactored as modern ESNEXT app
- Considered [npm-check-updates](https://www.npmjs.com/package/npm-check-updates) but can't get past the 6.86 MB download!
- Oh how I wish `npm outdated` worked
