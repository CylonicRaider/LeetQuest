# BrowserQuest server

This directory contains the server source code, along with a built version of
the game map.

The dependencies of the server (as well as of the client) are listed in the
project-level `package.json` file.

## Configuration

The default server settings (given in the project-level `config.default.json`
file) can be individually overridden by writing a `config.json` file.

## Monitoring

The server provides a primitive monitoring endpoint at the `/status` URL.

It returns a JSON array containing the number of players in all worlds on this
game server.
