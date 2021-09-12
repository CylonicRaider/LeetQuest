import bison from "bison";
import { createServer as _createServer } from "http";
import forEach from "lodash-es/forEach.js";
import { URL } from "url";
import websocket from "websocket";
import { createServer } from "websocket-server";
import miksagoConnection from "websocket-server/lib/ws/connection.js";

import log from "./log.js";
import buildStaticApp from "./static.js";
import * as Utils from "./utils.js";

const { request: worlizeRequest } = websocket;

const useBison = false;

/**
 * Abstract Server and Connection classes
 */
class Server {
    constructor(port, host) {
        this.port = port;
        this.host = host;
    }

    onConnect(callback) {
        this.connection_callback = callback;
    }

    onError(callback) {
        this.error_callback = callback;
    }

    broadcast(_message) {
        throw "Not implemented";
    }

    forEachConnection(callback) {
        forEach(this._connections, (connection) => callback(connection));
    }

    addConnection(connection) {
        this._connections[connection.id] = connection;
    }

    removeConnection(id) {
        delete this._connections[id];
    }

    getConnection(id) {
        return this._connections[id];
    }
}

class Connection {
    constructor(id, connection, server) {
        this._connection = connection;
        this._server = server;
        this.id = id;
    }

    onClose(callback) {
        this.close_callback = callback;
    }

    listen(callback) {
        this.listen_callback = callback;
    }

    broadcast(_message) {
        throw "Not implemented";
    }

    send(_message) {
        throw "Not implemented";
    }

    sendUTF8(_data) {
        throw "Not implemented";
    }

    close(logError) {
        log.info(
            `Closing connection to ${this._connection.remoteAddress}.` +
                (logError ? ` Error: ${logError}` : ""),
        );
        this._connection.close();
    }
}

/**
 * MultiVersionWebsocketServer
 *
 * Websocket server supporting draft-75, draft-76 and version 08+ of the WebSocket protocol.
 * Fallback for older protocol versions borrowed from https://gist.github.com/1219165
 */
export class MultiVersionWebsocketServer extends Server {
    constructor(port, host) {
        super(port, host);

        this.worlizeServerConfig = {
            // All options *except* 'httpServer' are required when bypassing
            // WebSocketServer.
            maxReceivedFrameSize: 0x10000,
            maxReceivedMessageSize: 0x100000,
            fragmentOutgoingMessages: true,
            fragmentationThreshold: 0x4000,
            keepalive: true,
            keepaliveInterval: 20000,
            assembleFragments: true,
            // autoAcceptConnections is not applicable when bypassing WebSocketServer
            // autoAcceptConnections: false,
            disableNagleAlgorithm: true,
            closeTimeout: 5000,
        };
        this._connections = {};
        this._counter = 0;

        this._statics = buildStaticApp();
        this._httpServer = _createServer((request, response) => {
            const path = new URL(request.url, `http://${request.headers.host}`)
                .pathname;
            switch (path) {
                case "/status":
                    if (this.status_callback) {
                        response.writeHead(200);
                        response.write(this.status_callback());
                        break;
                    }
                // falls through
                default:
                    this._statics(request, response);
                    return;
            }
            response.end();
        });
        this._httpServer.listen(port, host, () => {
            log.info(`Server is listening on host ${host || "*"} port ${port}`);
        });

        this._miksagoServer = createServer();
        this._miksagoServer.server = this._httpServer;
        this._miksagoServer.addListener("connection", (connection) => {
            // Add remoteAddress property
            connection.remoteAddress = connection._socket.remoteAddress;

            // We want to use "sendUTF" regardless of the server implementation
            connection.sendUTF = connection.send;
            const c = new MiksagoWebSocketConnection(
                this._createId(),
                connection,
                this,
            );

            this._onWSConnection(c, c._req.url);
        });

        this._httpServer.on("upgrade", (req, socket, head) => {
            const path = new URL(req.url, `http://${req.headers.host}`)
                .pathname;
            if (path !== "/dispatch" && path !== "/game") {
                socket.close();
                return;
            }
            if (typeof req.headers["sec-websocket-version"] !== "undefined") {
                // WebSocket hybi-08/-09/-10 connection (WebSocket-Node)
                const wsRequest = new worlizeRequest(
                    socket,
                    req,
                    this.worlizeServerConfig,
                );
                try {
                    wsRequest.readHandshake();
                    const wsConnection = wsRequest.accept(
                        wsRequest.requestedProtocols[0],
                        wsRequest.origin,
                    );
                    const c = new WorlizeWebSocketConnection(
                        this._createId(),
                        wsConnection,
                        this,
                    );
                    this._onWSConnection(c, path);
                } catch (e) {
                    log.error(
                        `WebSocket Request unsupported by WebSocket-Node: ${e.toString()}`,
                    );
                    return;
                }
            } else {
                // WebSocket hixie-75/-76/hybi-00 connection (node-websocket-server)
                if (
                    req.method === "GET" &&
                    req.headers.upgrade &&
                    req.headers.connection &&
                    req.headers.upgrade.toLowerCase() === "websocket" &&
                    req.headers.connection.toLowerCase() === "upgrade"
                ) {
                    new miksagoConnection(
                        this._miksagoServer.manager,
                        this._miksagoServer.options,
                        req,
                        socket,
                        head,
                    );
                }
            }
        });
    }

    _onWSConnection(c, path) {
        switch (path) {
            case "/dispatch":
                // TODO: Retrieve the host and port the request used and
                //       reflect them back explicitly.
                c.send({ status: "OK", host: null, port: null });
                c.close();
                return;
            case "/game":
                break;
            default:
                c.close();
                return;
        }
        if (this.connection_callback) {
            this.connection_callback(c);
        }
        this.addConnection(c);
    }

    _createId() {
        return `5${Utils.random(99)}${this._counter++}`;
    }

    broadcast(message) {
        this.forEachConnection((connection) => {
            connection.send(message);
        });
    }

    onRequestStatus(status_callback) {
        this.status_callback = status_callback;
    }
}

/**
 * Connection class for Websocket-Node (Worlize)
 * https://github.com/Worlize/WebSocket-Node
 */
export class WorlizeWebSocketConnection extends Connection {
    constructor(id, connection, server) {
        super(id, connection, server);

        this._connection.on("message", (message) => {
            if (this.listen_callback) {
                if (message.type === "utf8") {
                    if (useBison) {
                        this.listen_callback(bison.decode(message.utf8Data));
                    } else {
                        try {
                            this.listen_callback(JSON.parse(message.utf8Data));
                        } catch (e) {
                            if (e instanceof SyntaxError) {
                                this.close(
                                    "Received message was not valid JSON.",
                                );
                            } else {
                                throw e;
                            }
                        }
                    }
                }
            }
        });

        this._connection.on("close", () => {
            if (this.close_callback) {
                this.close_callback();
            }
            delete this._server.removeConnection(this.id);
        });
    }

    send(message) {
        let data;
        if (useBison) {
            data = bison.encode(message);
        } else {
            data = JSON.stringify(message);
        }
        this.sendUTF8(data);
    }

    sendUTF8(data) {
        this._connection.sendUTF(data);
    }
}

/**
 * Connection class for websocket-server (miksago)
 * https://github.com/miksago/node-websocket-server
 */
export class MiksagoWebSocketConnection extends Connection {
    constructor(id, connection, server) {
        super(id, connection, server);

        this._connection.addListener("message", (message) => {
            if (this.listen_callback) {
                if (useBison) {
                    this.listen_callback(bison.decode(message));
                } else {
                    this.listen_callback(JSON.parse(message));
                }
            }
        });

        this._connection.on("close", () => {
            if (this.close_callback) {
                this.close_callback();
            }
            delete this._server.removeConnection(this.id);
        });
    }

    send(message) {
        let data;
        if (useBison) {
            data = bison.encode(message);
        } else {
            data = JSON.stringify(message);
        }
        this.sendUTF8(data);
    }

    sendUTF8(data) {
        this._connection.send(data);
    }
}
