# LeetQuest server

This directory contains the server source code, along with a built version of
the game map.

The dependencies of the server (as well as of the client) are listed in the
project-level `package.json` file.

## Configuration

The default server settings (given in the project-level `config.default.json`
file) can be individually overridden by writing a `config.json` file.

The following variables are defined:

-   `host`: The IP address to listen on. Defaults to all interfaces.
-   `port`: The port to listen on. The default is `8000`.
-   `world-count`: The amount of (parallel) game worlds to maintain.
    Defaults to `5`.
-   `world-capacity`: How many players to allow per world. Defaults to `200`.
-   `map`: Path of the `world_server.json` game map file. The default map is
    shipped along with the source code.
-   `log-level`: Logging level to use, as a string understood by Pino.
    Defaults to `info`.

## Monitoring

The server provides a primitive monitoring endpoint at the `/status` URL.

It returns a JSON array containing the number of players in all worlds on this
game server.
