'use strict';

const EventEmitter = require('events').EventEmitter;
const _ = require('lodash');
const qUtils = require('qemitter/utils');
const RunnerEvents = require('../../constants/runner-events');
const MochaAdapter = require('./mocha-adapter');
const BrowserAgent = require('../../browser-agent');

module.exports = class MochaBuilder extends EventEmitter {
    static create(browserId, config, browserPool, testSkipper) {
        return new MochaBuilder(browserId, config, browserPool, testSkipper);
    }

    constructor(browserId, config, browserPool, testSkipper) {
        super();

        this._browserId = browserId;
        this._sharedMochaOpts = config.mochaOpts;
        this._ctx = _.clone(config.ctx);
        this._browserPool = browserPool;
        this._testSkipper = testSkipper;
    }

    buildAdapters(filenames) {
        const mkAdapters = (file) => {
            const mocha = this._createMocha()
                .attachTestFilter((test, index) => {
                    // each adapter must contain one test
                    if (index - file.lastLoadedTestIndex === 1) {
                        ++file.lastLoadedTestIndex;
                        return true;
                    }

                    return false;
                })
                .loadFile(file.name);

            return mocha.tests.length ? [mocha].concat(mkAdapters(file)) : [];
        };

        return _(filenames)
            .map((name) => ({name, lastLoadedTestIndex: -1}))
            .map((file) => mkAdapters(file))
            .flatten()
            .value();
    }

    buildSingleAdapter(filenames) {
        return this._createMocha().loadFiles(filenames);
    }

    _createMocha() {
        const browserAgent = BrowserAgent.create(this._browserId, this._browserPool);
        const mocha = MochaAdapter.create(this._sharedMochaOpts, browserAgent, this._ctx);

        qUtils.passthroughEvent(mocha, this, [
            RunnerEvents.BEFORE_FILE_READ,
            RunnerEvents.AFTER_FILE_READ
        ]);

        return mocha.applySkip(this._testSkipper);
    }
};
