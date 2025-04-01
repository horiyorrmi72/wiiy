import { Express } from 'express';
import express from 'express';
import * as fs from 'fs';
import {
  authenticatedRequestHandler,
  callbackRequestHandler,
} from '../../lib/util';

var routers = function (app: Express) {
  fs.readdirSync(__dirname)
    .filter(function (file) {
      return (
        file.indexOf('.') !== 0 && file !== 'index.ts' && file !== 'callback.ts'
      );
    })
    .forEach(function (name) {
      var router = require(__dirname + '/' + name);
      if (router.className == 'signup') {
        app.use('/api/' + router.className, express.json(), router.routes);
      } else {
        app.use(
          '/api/' + router.className,
          express.json({ limit: '10mb' }),
          authenticatedRequestHandler,
          router.routes
        );
      }
    });
  // For callback requests, we'll authenticate via nonce.
  app.use(
    '/api/callback',
    express.json(),
    callbackRequestHandler,
    require(__dirname + '/callback').routes
  );
};

module.exports = routers;
