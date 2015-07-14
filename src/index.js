!function (extend, jsrender, linq, util) {
    'use strict';

    var number = util.number;

    jsrender.jsviews.views.settings.delimiters('<%', '%>');

    module.exports = function (inputs, outputs, callback) {
        var that = this,
            assembleInputs;

        inputs.deleted.forEach(function (filename) {
            outputs[filename] = null;
        });

        if (Object.getOwnPropertyNames(inputs.newOrChanged).some(isUnderLayoutPath)) {
            assembleInputs = inputs.all;
        } else {
            assembleInputs = inputs.newOrChanged;
        }

        assembleInputs = linq(assembleInputs).where(function (_, filename) {
            return !isUnderLayoutPath(filename);
        }).run();

        linq(assembleInputs).select(function (entry, filename) {
            outputs[filename] = entry;
        }).run();

        Object.getOwnPropertyNames(inputs.all).forEach(function (filename) {
            isUnderLayoutPath(filename) && jsrender.loadString(filename.substr(9), inputs.all[filename].toString());
        });

        Object.getOwnPropertyNames(assembleInputs).forEach(function (filename) {
            var input = assembleInputs[filename],
                html = input.toString(),
                content;

            try {
                content = parseContent(html);
            } catch (ex) {
                that.log('Failed to parse content ' + filename + ' due to ' + ex.message);
                throw ex;
            }

            var layoutName = content.__layout;

            if (!layoutName) {
                throw new Error(filename + ' should define layout file as "__layout"');
            }

            var render = jsrender.render[layoutName];

            if (!render) {
                throw new Error('Layout ' + layoutName + ' does not exists, as defined in ' + filename);
            }

            var output = new Buffer(render(content));

            outputs[filename] = output;

            that.log([
                'Assembling ',
                filename,
                ' (',
                number.bytes(input.length),
                ' -> ',
                number.bytes(output.length),
                ', ',
                ('+' + (((output.length / input.length) - 1) * 100).toFixed(1) + '').replace(/^\+\-/, '-'),
                '%)'
            ].join(''));
        });

        callback(null, outputs);
    };

    function isUnderLayoutPath(filename) {
        return /^__layout\//.test(filename);
    }

    function parseContent(content) {
        var boundaryPattern = /^---\s*(.*)/,
            lines = content.split('\n'),
            contentTitle,
            contentLines,
            json = {};

        lines.forEach(function (line) {
            var boundaryMatch = boundaryPattern.exec(line);

            if (boundaryMatch) {
                if (contentLines) {
                    contentLines = contentLines.join('\n');

                    if (contentTitle) {
                        json[contentTitle] = contentLines;
                    } else {
                        extend(json, JSON.parse(contentLines));
                    }

                    contentLines = null;
                } else {
                    contentLines = [];
                    contentTitle = trim(boundaryMatch[1]);
                }
            } else if (contentLines) {
                contentLines.push(line);
            }
        });

        return json;
    }

    function trim(str) {
        return str.replace(/(^\s+)|(\s+$)/g, '');
    }
}(require('./extend'), require('node-jsrender'), require('async-linq'), require('publishjs').util);