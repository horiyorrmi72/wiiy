import sslRedirect from 'heroku-ssl-redirect';
import { AddressInfo } from 'net';
import bodyParser from 'body-parser';
import { corsOptions } from './server/lib/constant';
import express from 'express';
import morgan from 'morgan';
import path from 'path';
import timeout from 'connect-timeout';
import { routes } from './server/routes';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { runScheduledTasks } from './server/services/emailService';

// read in process config values from env var for dev
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Create an express instance
var app = express();

// enable ssl redirect
app.use(sslRedirect());

app.use(timeout('30s'));
// add request logging
app.use(morgan('tiny'));

// trust first proxy
app.set('trust proxy', 1);

// enable cors
app.use(cors(corsOptions));

app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// init all app routes
routes(app);

// check user status every 24 Hours then after send email
cron.schedule('0 0 * * *', runScheduledTasks);

// finally, default to index.html
app.use(express.static(__dirname + '/client/build'));
app.get('/*', function (req, res) {
  const indexFile = path.join(__dirname, 'client/build/index.html');
  res.sendFile(indexFile);
});

// Start our server
var server = app.listen(process.env.PORT || 3000, async function () {
  let serverAddress = server.address() as AddressInfo;
  console.log(
    'Express server listening on port ' + serverAddress.port,
    process.env.NODE_ENV
  );
});

process.on('unhandledRejection', (reason, p) => {
  // p 是 promise，包含错误栈，如果是请求的话，还会包含 request 和 response 的信息
  // ref: http://nodejs.cn/api/process/event_unhandledrejection.html
  console.error('unhandledRejection', p);
});

process.on('uncaughtException', function (err, origin) {
  /* handle errors here */
  console.error('uncaughtException:', err, origin);
});
