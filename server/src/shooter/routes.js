const Joi = require('@hapi/joi');
const Screenshot = require('./screenshot');
const { default: PQueue } = require('p-queue');

class Routes {
  init(server, options) {
    this.server = server;
    const sc = new Screenshot();
    sc.init(options, server);
    const queue = new PQueue({ concurrency: 5 });

    return [
      {
        method: 'POST',
        path: '/fetch',
        handler: async request => {
          const ip = request.headers['x-forwarded-for'] || request.info.remoteAddress;

          const reqLog = `Request from ${ip}:\n${JSON.stringify(request.payload)}`;
          server.log([ 'fetch', 'debug' ], reqLog);

          if (this.checkAccess(request, options) !== true) {
            server.log([ 'fetch', 'notice' ], `Request from ${ip} was rejected.`);
            return { result: false, message: 'not allowed' };
          }

          const reqData = request.payload;

          if (Joi.object({
            chartUrl: Joi.string().pattern(/^https:\/\/www\.tradingview\.com\/chart\/[a-z0-9#\/]+$/i).required(),
            symbol: Joi.string().pattern(/^[a-z0-9_:-]+$/i),
            signalSecret: Joi.string()
          }).validate(reqData).error) {
            this.server.log([ 'fetch', 'error' ], `Invalid request payload: ${JSON.stringify(reqData)}`);
            return { result: false, message: 'not allowed' };
          }

          const screenshotUrl = await queue.add(() => this.retry(() => sc.take(reqData.chartUrl, reqData.symbol), {
            timeout: 10000,
            maxTries: 5,
            validateFnc: url => {
              if (typeof url !== 'string' || !url.includes('.png')) {
                this.server.log([ 'screenshot', 'warning' ], `Failed to generate screenshot. Trying again in 10 seconds.`);
                return false;
              }
  
              return true;
            }
          }));

          if (screenshotUrl) {
            server.log([ 'screenshot', 'info' ], `Generated screenshot ${screenshotUrl}${reqData.symbol ? ` (${reqData.symbol})`: ''}`);
            return { screenshotUrl };
          } else {
            server.log([ 'screenshot', 'info' ], `Failed to generate screenshot for ${screenshotUrl}`);
            return { screenshotUrl: false };
          }
        }
      }
    ];
  }

  checkAccess(request, options) {
    if (!Array.isArray(options.ipWhitelist) && !options.signalSecret) return true;

    if (options.signalSecret && request.payload.signalSecret === options.signalSecret) return true;
    if (Array.isArray(options.ipWhitelist) && options.ipWhitelist.includes(ip)) return true;
    
    return false;
  }

  async sleep(time) {
    return new Promise(resolve => {
      setTimeout(resolve, time);
    });
  }

  async retry(fnc, options) {
    let { maxTries, timeout, validateFnc, initialTimeout } = Object.assign({ maxTries: 3, timeout: 10000, initialTimeout:0, validateFnc: null }, options || {});

    if (maxTries <= 0) return null;

    if (typeof initialTimeout === 'number' && initialTimeout > 0) {
      await this.sleep(initialTimeout);
    }

    try {
      maxTries--;
      const result = await fnc(maxTries);
      let validationResult = typeof validateFnc === 'function' ? validateFnc(result, maxTries) : true;

      if (validationResult instanceof Promise) {
        validationResult = await validationResult;
      }

      if (validationResult) {
        return typeof validationResult !== 'boolean' ? validationResult : result;
      } else {
        await this.sleep(timeout);
        return this.retry(fnc, { maxTries, timeout, validateFnc });
      }
    } catch (err) {
      this.server.log([ 'api', 'retry' ], err);
      await this.sleep(timeout);
      return this.retry(fnc, { maxTries, timeout, validateFnc });
    }
  }
}

module.exports = (server, options) => {
  const routes = new Routes();
  return routes.init(server, options);
};
