import Promise from 'promise';
import browserInstallations from '../browser/installations';
import BrowserConnection from '../browser/connection';
import LocalBrowserConnection from '../browser/local-connection';
import { MESSAGES, getText } from '../messages';


export default class Bootstrapper {
    static BROWSER_CONNECTION_READY_TIMEOUT = 30 * 1000;

    constructor (browserConnectionGateway) {
        this.browserConnectionGateway = browserConnectionGateway;

        this.src             = [];
        this.browsers        = [];
        this.filter          = null;
        this.reporter        = null;
        this.reportOutStream = null;
    }

    static _convertBrowserAliasToBrowserInfo (browser) {
        if (typeof browser !== 'string')
            return browser;

        var browserInfo = browserInstallations.getInfo(browser);

        if (!browserInfo)
            throw new Error(getText(MESSAGES.cantFindBrowserForAlias, browser));

        return browserInfo;
    }

    static async _waitBrowserConnectionsReady (browserConnections) {
        var readyTimeout = setTimeout(() => {
            throw new Error(getText(MESSAGES.cantEstablishBrowserConnection));
        }, Bootstrapper.BROWSER_CONNECTION_READY_TIMEOUT);

        var onError = msg => {
            throw new Error(msg);
        };

        browserConnections.forEach(bc => bc.once('error', onError));

        await * browserConnections
            .filter(bc => !bc.ready)
            .map(bc => new Promise(resolve => bc.once('ready', resolve)));

        browserConnections.forEach(bc => bc.removeListener('error', onError));
        clearTimeout(readyTimeout);
    }

    _createConnectionFromBrowserInfo (browser) {
        if (browser instanceof BrowserConnection)
            return browser;

        return new LocalBrowserConnection(this.browserConnectionGateway, browser);
    }

    async _getBrowserConnections () {
        var browserConnections = this.browsers
            .map(Bootstrapper._convertBrowserAliasToBrowserInfo)
            .map(browser => this._createConnectionFromBrowserInfo(browser));

        await Bootstrapper._waitBrowserConnectionsReady(browserConnections);

        return browserConnections;
    }

    async _getTests () {
        //TODO
    }

    _createReporter () {
        //TODO
    }


    // API
    static freeBrowserConnections (browserConnections, errorHandler) {
        browserConnections.forEach(bc => {
            bc.removeListener('error', errorHandler);

            if (bc instanceof LocalBrowserConnection)
                bc.close();
        });
    }

    async createRunnableConfiguration () {
        var reporter = this._createReporter();

        var [browserConnections, tests] = await * [
            this._getBrowserConnections(),
            this._getTests()
        ];

        return { reporter, browserConnections, tests };
    }
}