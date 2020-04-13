# tv-shooter

A dockerized web service that takes screenshots on TradingView and returns the screenshot url.

## How it works

It utilizes a headless Chrome controlled by puppeteer to open charts in tabs and then triggers the screenshot functionality on TradingView.
It's throttled to only take up to 5 screenshots simultaneously so make sure the consuming client waits long enough if a lot of requests being processed.
This is also to spare RAM and CPU. I would generally recommend to have at least 4 GB of RAM in the server. Less might work.

## Stability

The system is fairly stable but problems with Chrome can still occur. Better error handling is probably still needed for this project.
Feel free to contribute! Another strategy is to restart the service using cron once per hour so it recovers automatically if chrome completely gives up.

## Development setup

Docker and docker-compose are recommended to run this web service.

1. Clone and cd into project root.
2. Run `yarn install`.
3. Run `cd server && yarn install`
4. Set TradingView credentials and a signal secret in `dev.env`.
5. Start the service with the `./start_dev.sh` script in the project root.

To stop the service run `./stop_dev.sh`;

The server runs on port 3000 by default. You can check if the service was able to sign into TradingView using the screenshot in `./sc`.  
Wait about a 1 minute for the screenshot to appear because the sign in process takes some time.

## Generating a screenshot

Send a post request to the `/fetch` endpoint. Use the `chartUrl` to tell the service what chart it should up open and take a screenshot from.  
The `signalSecret` (set that in `dev.env`) acts like a password. Only if it matches the one in the settings the service will process the request.

**So for production make sure to send your requests over HTTPS!**

**Example:**

`curl --request POST \
  --url http://127.0.0.1:3000/fetch \
  --header 'content-type: application/json' \
  --data '{
	"chartUrl": "https://www.tradingview.com/chart/xxx/",
	"signalSecret": "xxx"
}'`

This would return something like:

```json
{
  "screenshotUrl": "https://www.tradingview.com/x/xxxx/"
}
```

**Taking the screenshot takes about 10 to 20 seconds as there is a lot going on in the background but it will process to 5 requests simultaneously**

## Configuration files

The config file `development` in `./server/config` is used if the service is started in development (using `start_dev.sh`).  
You can change to the production mode by setting `CONFIG=production` in your env file.