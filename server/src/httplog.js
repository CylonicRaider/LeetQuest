import auth from "basic-auth";
import clfdate from "clf-date";
import pino from "pino";

function orNone(v) {
    return v || "-";
}
function qOrNone(v) {
    return v ? `"${v}"` : "-";
}

export function formatLogLine(data) {
    const remoteAddress = data.req.remoteAddress.replace(
        /^::ffff:(\d+\.\d+\.\d+\.\d+)$/,
        "$1",
    );
    const userInfo = auth.parse(data.req.headers.authorization);
    const httpVersion = data.req.raw.httpVersion;
    const result =
        `${remoteAddress} - ${orNone(userInfo ? userInfo.name : null)} ` +
        `[${clfdate(new Date())}] ` +
        `"${data.req.method} ${data.req.url} HTTP/${httpVersion}" ` +
        `${data.res.statusCode} ` +
        `${orNone(data.res.headers["content-length"])} ` +
        `${qOrNone(data.res.headers.referer || data.res.headers.referrer)} ` +
        `${qOrNone(data.req.headers["user-agent"])} ` +
        `"id=${data.req.id} time=${data.responseTime}ms"`;
    return result;
}

export default (info) => {
    const logData = {
        req: pino.stdSerializers.req(info.res.req),
        res: pino.stdSerializers.res(info.res),
        responseTime: info.responseTime,
    };
    return [info, formatLogLine(logData)];
};
