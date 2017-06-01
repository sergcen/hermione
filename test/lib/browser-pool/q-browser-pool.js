'use strict';

const proxyquire = require('proxyquire');
const q = require('q');

describe('browser-pool/q-browser-pool', () => {
    const sandbox = sinon.sandbox.create();

    const stubBrowserPool = () => {
        return {
            getBrowser: sandbox.stub(),
            freeBrowser: sandbox.stub(),
            cancel: sandbox.stub()
        }
    };

    let QBrowserPool;
    let bluebirdQ;

    beforeEach(() => {
        bluebirdQ = sandbox.stub().returns(q());

        QBrowserPool = proxyquire('../../../lib/browser-pool/q-browser-pool', {
            'bluebird-q': bluebirdQ
        });
    });

    afterEach(() => sandbox.restore());

    describe('getBrowser', () => {
        it('should get a browser', () => {
            const browserPool = stubBrowserPool();
            const qBrowserPool = QBrowserPool.create(browserPool);

            return qBrowserPool.getBrowser('id')
                .then(() => assert.calledOnceWith(browserPool.getBrowser, 'id'));
        });

        it('should wrap a result into "q" promises', () => {
            const browserPool = stubBrowserPool();
            const qBrowserPool = QBrowserPool.create(browserPool);
            const browser = {foo: 'bar'};
            const qPromisifiedBrowser = {baz: 'bar'};

            browserPool.getBrowser.returns(browser);
            bluebirdQ.withArgs(browser).returns(q(qPromisifiedBrowser));

            return assert.becomes(qBrowserPool.getBrowser(), qPromisifiedBrowser);
        });
    });

    describe('freeBrowser', () => {
        it('should free a browser', () => {
            const browserPool = stubBrowserPool();
            const qBrowserPool = QBrowserPool.create(browserPool);
            const browser = {foo: 'bar'};

            return qBrowserPool.freeBrowser(browser)
                .then(() => assert.calledOnceWith(browserPool.freeBrowser, browser));
        });

        it('should wrap a result into "q" promises', () => {
            const browserPool = stubBrowserPool();
            const qBrowserPool = QBrowserPool.create(browserPool);
            const browser = {foo: 'bar'};
            const qPromisifiedBrowser = {baz: 'bar'};

            browserPool.freeBrowser.returns(browser);
            bluebirdQ.withArgs(browser).returns(q(qPromisifiedBrowser));

            return assert.becomes(qBrowserPool.freeBrowser(), qPromisifiedBrowser);
        });
    });

    describe('cancel', () => {
        it('should cancel a browser pool', () => {
            const browserPool = stubBrowserPool();
            const qBrowserPool = QBrowserPool.create(browserPool);

            browserPool.cancel.returns({foo: 'bar'});

            assert.deepEqual(qBrowserPool.cancel(), {foo: 'bar'});
            assert.calledOnce(browserPool.cancel);
        });
    });
});
