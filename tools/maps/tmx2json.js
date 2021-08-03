var fs = require("fs");
var process = require("process");

var _ = require("underscore");
var sax = require("sax");

var input = fs.createReadStream(process.argv[2]);
var parser = sax.createStream(true);

var stateStack = [{ props: {}, children: {}, childCount: 0 }];
parser.on("opentag", function (desc) {
    var parentState = _.last(stateStack);
    var newState = { children: {}, childCount: 0 };
    newState.props = _.mapObject(desc.attributes, function (value) {
        return /^\d+$/.test(value) ? Number(value) : value;
    });
    if (parentState.children[desc.name]) {
        parentState.children[desc.name].push(newState.props);
    } else {
        parentState.children[desc.name] = [newState.props];
    }
    parentState.childCount++;
    stateStack.push(newState);
});
parser.on("text", function (text) {
    if (/^\s*$/.test(text)) return;
    throw new Error("Unexpected text in map file!");
});
parser.on("cdata", function () {
    throw new Error("Unexpected CDATA in map file!");
});
parser.on("closetag", function () {
    stateStack.pop();
    var state = _.last(stateStack);
    if (state.childCount === 1) {
        var key = _.keys(state.children)[0];
        state.props[key] = state.children[key][0];
    } else {
        _.extend(state.props, state.children);
    }
});
parser.on("end", function () {
    fs.writeFile(
        process.argv[3],
        JSON.stringify(stateStack[0].props),
        function (err) {
            if (err) throw err;
        },
    );
});

input.pipe(parser);
