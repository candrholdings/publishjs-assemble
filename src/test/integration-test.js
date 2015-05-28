!function (assert, async, linq, path) {
    'use strict';

    require('vows').describe('Integration test').addBatch({
        'When minifying a CSS file': {
            topic: function () {
                var callback = this.callback;

                async.parallel({
                    input: function (callback) {
                        require('publishjs')({
                            cache: false,
                            log: false,
                            processors: {
                                assemble: require('../index')
                            }
                        }).build(function (pipe, callback) {
                            pipe.from(path.resolve(path.dirname(module.filename), 'integration-test-files/input'))
                                .assemble()
                                .run(callback);
                        }, callback);
                    },
                    baseline: function (callback) {
                        require('publishjs')({
                            cache: false,
                            log: false
                        }).build(function (pipe, callback) {
                            pipe.from(path.resolve(path.dirname(module.filename), 'integration-test-files/baseline'))
                                .run(callback);
                        }, callback);
                    }
                }, callback);
            },

            'should returns a minified copy': function (topic) {
                var input = linq(topic.input).select(function (buffer) {
                        return buffer.toString().replace(/\r/g, '');
                    }).run(),
                    baseline = linq(topic.baseline).select(function (buffer) {
                        return buffer.toString().replace(/\r/g, '');
                    }).run();

                assert.deepEqual(input, baseline);
            }
        }
    }).export(module);
}(
    require('assert'),
    require('async'),
    require('async-linq'),
    require('path')
);