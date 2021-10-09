# LeetQuest

A Web MMORPG forked off
[BrowserQuest](https://github.com/mozilla/BrowserQuest).

## Usage

**Building the client**: To build the client, run `npm run build`.

**Building game maps**: This (particularly expensive) step needs to run
separately via `npm run build-maps`. It is only necessary when the
`tools/maps/tmx/map.tmx` file has been edited — the built map files are
version-controlled.

**Running the server**: To run the game server, run `npm start` (remember to
build the client if necessary). The server takes a single optional
command-line parameter, viz. the name of a configuration file, which defaults
to `config.json`. The configuration file overrides the defaults supplied in
`config.default.json`.

Additional documentation is located in the `client` and `server` directories.

### Contributing

To invoke the code auto-formatter and linter — preferrably before every
commit —, run `npm run cleanup`. The formatter and linter are available
separately as `npm run format` and `npm run lint`, respectively.

To format and/or lint the entire source code unconditionally, use
`npm run format-full`, `npm run lint-full`, or `npm run cleanup-full` instead.

## License

Code is licensed under MPL 2.0. Content is licensed under CC-BY-SA 3.0.
See the LICENSE file for details.

## Credits

The original BrowserQuest was created by
[Franck Lecollinet](https://twitter.com/whatthefranck) and
[Guillaume Lecollinet](https://twitter.com/glecollinet) from
[Little Workshop](https://www.littleworkshop.fr).
