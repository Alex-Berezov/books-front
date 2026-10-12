'use strict';

/**
 * Потолок приёма запроса сервером фронта (`LEGACY-465`, решение арбитра 12.10.2026, ревью круг 1).
 *
 * Загрузки файлов идут через серверный прокси `app/api/backend/[...path]` — тело уходит в API
 * потоком через этот процесс. У Node `server.requestTimeout` по умолчанию 300 с и считает приём
 * всего запроса вместе с телом, а Next его не меняет: загрузка дольше пяти минут (100 МБ
 * по каналу медленнее ~2,7 Мбит/с) обрывалась бы на середине.
 *
 * Модуль подключается до старта `server.js` (`node --require` в `CMD` `Dockerfile`) и ставит
 * значение каждому создаваемому серверу. Не через `http.Server.prototype`: Node присваивает
 * `requestTimeout` экземпляру в конструкторе. Значение конечное, не 0, и `headersTimeout`
 * не трогается: защита от медленных запросов остаётся.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS preload for node --require: no import here
const http = require('node:http');

const REQUEST_TIMEOUT_MS = 60 * 60 * 1000;

const createServer = http.createServer;

http.createServer = function createServerWithRequestTimeout(...args) {
  const server = createServer.apply(this, args);
  server.requestTimeout = REQUEST_TIMEOUT_MS;
  return server;
};

module.exports = { REQUEST_TIMEOUT_MS };
