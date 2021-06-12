const Puppeteer = require('puppeteer');

class Screenshot {
  async init(options, server) {
    // To make things easy we just disable the sandbox.
    // Should be ok as we ever only visit tradingview.com.
    this._browser = await Puppeteer.launch({
      args: [
        '--disable-setuid-sandbox',
        '--no-sandbox'
      ]
    });

    this._browser.on('disconnected', () => {
      server.log([ 'screenshot', 'error' ], `Browser disconnected. Setting up a new instance.`);
      this.init(options, server);
    });
    
    this._options = options;
    
    if (options.username) {
      server.log([ 'screenshot', 'info' ], `Attempting to log into TradingView account.`);

      const page = await this.getPage('https://www.tradingview.com');
  
      // Log into trading view.
      // We only do this once and keep the browser open.
      // Precaution measurement to prevent any security alerts at trading view in case they have such mechanisms.
      await page.click('button.js-header-user-menu-button');
      await page.click('[data-name="header-user-menu-sign-in"]');
      await page.waitFor(3000);
      await page.click('.tv-signin-dialog__toggle-email');
      await page.waitFor(3000);
      await page.type('form[action="/accounts/signin/"] input[name="username"]', options.username);
      await page.type('form[action="/accounts/signin/"] input[name="password"]', options.password);
      await page.click('form[action="/accounts/signin/"] button[type="submit"]');
      await page.waitFor(20000);
  
      // Take a screenshot in case we need to see if the login worked.
      await page.screenshot({ path: '/home/node/Downloads/loginSuccess.png' });
  
      // Switch to a page that doesn't keep the cpu so busy
      await page.goto('https://www.tradingview.com/gopro/?source=header_main_menu&feature=pricing');
    }
  }

  async getPage(url) {
    const page = await this._browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36');

    // Should be a good ratio for twitter pics.
    await page.setViewport({
      width: this._options.width,
      height: this._options.height,
      deviceScaleFactor: 1,
    });

    await page.goto(url, { timeout: 30000 * 4 /* 2 minutes */ });

    return page;
  }

  async waitForChartData(page) {
    await page.waitForFunction('TradingViewApi && TradingViewApi.activeChart().dataReady() === true', {
      polling: 500
    });

    return page.waitFor(15000);
  }

  async take(url, symbol) {
    let page;

    try {
      page = await this.getPage(url);

      page.on('dialog', async dialog => {
        await dialog.accept();
      });

      // Need to wait for the chart to paint.
      await this.waitForChartData(page);
      
      if (symbol) {
        await page.evaluate(symbol => {
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              resolve();
            }, 6000);

            TradingViewApi.activeChart().setSymbol(symbol);
          });
        }, symbol);

        await this.waitForChartData(page);
      }

      // Inject the javascript to trigger trading views "native" screenshot function.
      const imageId = await page.evaluate(() => {
        return new Promise((resolve, reject) => {
          TradingViewApi.subscribe('onScreenshotReady', id => {
            resolve(id);
          });

          TradingViewApi.activeChart().executeActionById('takeScreenshot');
        });
      });

      await page.goto(`https://www.tradingview.com/x/${imageId}/`);
      await page.waitForSelector('img');

      const sc = await page.evaluate(() => {
        return new Promise((resolve, reject) => {
          resolve(document.querySelector('img').src);
        });
      });

      await page.close();

      return sc;
    } catch (err) {
      if (page) {
        await page.screenshot({ path: '/home/node/Downloads/lastError.png' });
        await page.close();
      }

      throw err;
    }
  }
}

module.exports = Screenshot;
