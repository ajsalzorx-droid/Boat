const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const pino = require("pino");
const pinoHttp = require("pino-http");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;

// One JSON line per request on stdout. LOG_LEVEL=debug|info|warn|error (default info).
const logger = pino({ level: process.env.LOG_LEVEL || "info" });

// Framework files and images would flood the log without saying anything useful
const NOT_LOGGED = /^\/(_next\/|favicon\.ico)|\.(?:webp|png|jpe?g|gif|svg|ico|mp4|mp3|woff2?|css|js|map)(?:\?|$)/;

// The Wati webhook's address carries its secret, so that part never reaches the log
const safeUrl = (url) => url.replace(/^(\/api\/wati\/webhook)\?.*/, "$1");

const httpLogger = pinoHttp({
  logger,
  autoLogging: { ignore: (req) => NOT_LOGGED.test(req.url) },
  // Only these fields are logged: never cookies (staff sessions), headers, bodies or visitor IPs
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: safeUrl(req.url) }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
  customLogLevel: (req, res, err) => (err || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info"),
  customSuccessMessage: (req, res) => `${req.method} ${safeUrl(req.url)} ${res.statusCode}`,
  customErrorMessage: (req, res) => `${req.method} ${safeUrl(req.url)} ${res.statusCode}`,
});

app.prepare().then(() => {
  createServer((req, res) => {
    httpLogger(req, res);
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, "0.0.0.0", (err) => {
    if (err) throw err;
    logger.info(`Ready on port ${port}`);
  });
});
