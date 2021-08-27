// optional TODO: allow setting this from the outside in a non-painful manner

export default {
    // if host and port are null, the client fills them in from its own
    // location -- which is what we usually want
    host: null,
    port: null,
    // allow load-balancing clients to different game servers -- does little
    // harm
    dispatcher: true,
};
