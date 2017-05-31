'use strict';

const BrowserPool = require('gemini-core').BrowserPool;
const QBrowserPool = require('./q-browser-pool');
const Browser = require('../browser');
const Events = require('../constants/runner-events');

exports.create = function(config, emitter) {
    const BrowserManager = {
        create: (id) => Browser.create(config, id),

        start: (browser) => browser.init(),
        onStart: (browser) => emitter.emitAndWait(Events.SESSION_START, browser.publicAPI, {browserId: browser.id}),

        // копипаста, исправь
        onQuit: (browser) => emitter.emitAndWait(Events.SESSION_END, browser.publicAPI, {browserId: browser.id}),
        quit: (browser) => browser.quit()
    };

    const configAdapter = {
        forBrowser: (id) => {
            const browserConfig = config.forBrowser(id);
            return {
                parallelLimit: browserConfig.sessionsPerBrowser,
                sessionUseLimit: browserConfig.testsPerSession
            };
        },

        getBrowserIds: () => config.getBrowserIds(),

        get system() {
            return config.system;
        }
    };

    return QBrowserPool.create(BrowserPool.create(BrowserManager, {
        logNamespace: 'hermione',
        config: configAdapter
    }));
};
