# LeetQuest

A Web MMORPG forked off
[BrowserQuest](https://github.com/mozilla/BrowserQuest).

## Usage

**Building the client**: To build the client, run `npm run build-client`.

**Building game maps**: This (particularly expensive) step needs to run
separately via `npm run build-maps`. It is only necessary when the `map.tmx`
file has been edited — the built map files are version-controlled.

**Running the server**: To run the game server, run `npm start`
                        (remember to re-build the client code for production,
                        if it has changed).

As default, the client is configured to connect to the server it is loaded
from; the server, in turn, listens on port `8000` by default, and serves the
client (if the latter is built).

More detailed documentation is located in the `client` and `server`
directories.

## License

Code is licensed under MPL 2.0. Content is licensed under CC-BY-SA 3.0.
See the LICENSE file for details.

## Credits

BrowserQuest was created by [Little Workshop](https://www.littleworkshop.fr):

-   Franck Lecollinet - [@whatthefranck](https://twitter.com/whatthefranck)
-   Guillaume Lecollinet - [@glecollinet](https://twitter.com/glecollinet)
