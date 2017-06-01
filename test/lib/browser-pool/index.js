'use strict';

const CoreBrowserPool = require('gemini-core').BrowserPool;
const _ = require('lodash');
const q = require('q');
const QEmitter = require('qemitter');
const BrowserPool = require('../../../lib/browser-pool');
const QBrowserPool = require('../../../lib/browser-pool/q-browser-pool');
const Browser = require('../../../lib/browser');
const Events = require('../../../lib/constants/runner-events');
const makeConfigStub = require('../../utils').makeConfigStub;

describe('browser-pool', () => {
    const sandbox = sinon.sandbox.create();

    beforeEach(() => {
        sandbox.stub(CoreBrowserPool, 'create');
        sandbox.stub(QBrowserPool, 'create');
        sandbox.stub(Browser, 'create');
    });

    afterEach(() => sandbox.restore());

    describe('create', () => {
        it('should create browser pool', () => {
            BrowserPool.create();

            assert.calledOnce(CoreBrowserPool.create);
            assert.calledWithMatch(CoreBrowserPool.create, sinon.match.any, {logNamespace: 'hermione'});
        });

        it('should wrap browser pool into "q" promises', () => {
            CoreBrowserPool.create.returns({foo: 'bar'});
            QBrowserPool.create.withArgs({foo: 'bar'}).returns({baz: 'bar'});

            assert.deepEqual(BrowserPool.create(), {baz: 'bar'});
        });

        describe('browser manager', () => {
            const getBrowserManager = () => CoreBrowserPool.create.lastCall.args[0];
            const stubBrowser = (id, publicAPI) => {
                return {
                    id,
                    publicAPI,
                    init: sandbox.stub(),
                    quit: sandbox.stub()
                }
            };

            it('should create a browser', () => {
                const config = {foo: 'bar'};
                BrowserPool.create(config);

                const BrowserManager = getBrowserManager();
                const browser = {baz: 'bar'};

                Browser.create.withArgs(config, 'id').returns(browser);

                assert.deepEqual(BrowserManager.create('id'), browser);

            });

            it('should start a browser', () => {
                BrowserPool.create();

                const BrowserManager = getBrowserManager();
                const browser = stubBrowser();
                browser.init.returns({foo: 'bar'});

                assert.deepEqual(BrowserManager.start(browser), {foo: 'bar'});
            });

            _.forEach({onStart: Events.SESSION_START, onQuit: Events.SESSION_END}, (event, method) => {
                describe(`${method}`, () => {
                    it(`should emit browser event "${event}"`, () => {
                        const emitter = new QEmitter();
                        const onEvent = sandbox.spy();
                        emitter.on(event, onEvent);

                        BrowserPool.create(null, emitter);

                        const BrowserManager = getBrowserManager();
                        const publicAPI = {foo: 'bar'};

                        return BrowserManager[method](stubBrowser('id', publicAPI))
                            .then(() => assert.calledOnceWith(onEvent, publicAPI, {browserId: 'id'}));
                    });

                    it('should wait all async listeners', () => {
                        const emitter = new QEmitter();
                        const onEvent = sandbox.stub().callsFake(() => q.delay(1).then(() => ({foo: 'bar'})));
                        emitter.on(event, onEvent);

                        BrowserPool.create(null, emitter);

                        const BrowserManager = getBrowserManager();

                        return BrowserManager[method](stubBrowser())
                            .then((resolved) => assert.deepEqual(resolved, [{foo: 'bar'}]));
                    });
                });
            });

            it('should quit a browser', () => {
                BrowserPool.create();

                const BrowserManager = getBrowserManager();
                const browser = stubBrowser();
                browser.quit.returns({foo: 'bar'});

                assert.deepEqual(BrowserManager.quit(browser), {foo: 'bar'});
            });
        });

        describe('adapter config', () => {
            const getAdapterConfig = () => CoreBrowserPool.create.lastCall.args[1].config;

            it('should return config for a browser', () => {
                const configStub = makeConfigStub({
                    browsers: ['id'],
                    sessionsPerBrowser: 100500,
                    testsPerSession: 500100
                });

                BrowserPool.create(configStub);

                assert.deepEqual(getAdapterConfig().forBrowser('id'), {parallelLimit: 100500, sessionUseLimit: 500100});
            });

            it('should return all browser ids', () => {
                BrowserPool.create(makeConfigStub({browsers: ['id1', 'id2']}));

                assert.deepEqual(getAdapterConfig().getBrowserIds(), ['id1', 'id2']);
            });

            it('should return a system section of a config', () => {
                BrowserPool.create(makeConfigStub({system: {foo: 'bar'}}));

                assert.deepEqual(getAdapterConfig().system, {foo: 'bar'});
            });
        });
    });
});
