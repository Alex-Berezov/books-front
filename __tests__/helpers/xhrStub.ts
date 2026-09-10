/**
 * Заглушка `XMLHttpRequest` для спек загрузки файлов.
 *
 * Одна на все спеки намеренно: до 10.09.2026 копий было две, они разошлись в поведении,
 * и обе перезаписывали заголовок по имени. Настоящий XHR ведёт себя иначе - имя сравнивает
 * без учёта регистра, а повторный вызов `setRequestHeader` значение **склеивает** через
 * запятую. Заглушка, которая перезаписывает, прячет живой дефект: склеенный `X-Upload-Token`
 * ручка не узнаёт и отвечает 401 (`LEGACY-372`).
 */

export interface XhrStubInstance {
  method: string;
  url: string;
  /** Имена приведены к нижнему регистру, повторы склеены через `, ` - как в браузере. */
  headers: Record<string, string>;
  body: unknown;
  status: number;
  response: unknown;
  responseType: string;
  aborted: boolean;
  upload: { addEventListener: (type: string, cb: (event: ProgressEvent) => void) => void };
  open: (method: string, url: string) => void;
  setRequestHeader: (key: string, value: string) => void;
  addEventListener: (type: 'load' | 'error' | 'abort', cb: () => void) => void;
  send: (body?: unknown) => void;
  abort: () => void;
  _listeners: { load: Array<() => void>; error: Array<() => void>; abort: Array<() => void> };
  _upload: { progress: Array<(event: ProgressEvent) => void> };
}

export interface XhrStubOptions {
  /** Отвечать ли самостоятельно на `send` (иначе ответ вызывает сама спека). */
  autoRespond?: () => boolean;
  /** Код ответа, которым заглушка отвечает на `send`. */
  status?: () => number;
  /** Тело ответа (для `responseType: 'json'`). */
  body?: () => unknown;
  /** Слать ли события прогресса перед `load`. */
  withProgress?: boolean;
}

export const createXhrStub = (options: XhrStubOptions = {}): XhrStubInstance => {
  const instance: XhrStubInstance = {
    method: '',
    url: '',
    headers: {},
    body: undefined,
    status: 0,
    response: null,
    responseType: '',
    aborted: false,
    _listeners: { load: [], error: [], abort: [] },
    _upload: { progress: [] },
    upload: {
      addEventListener(type, cb) {
        if (type === 'progress') instance._upload.progress.push(cb);
      },
    },
    open(method, url) {
      instance.method = method;
      instance.url = url;
    },
    setRequestHeader(key, value) {
      const name = key.toLowerCase();
      instance.headers[name] =
        name in instance.headers ? `${instance.headers[name]}, ${value}` : value;
    },
    addEventListener(type, cb) {
      instance._listeners[type].push(cb);
    },
    send(body) {
      instance.body = body;
      if (options.autoRespond && !options.autoRespond()) return;
      queueMicrotask(() => {
        if (instance.aborted) return;
        if (options.withProgress !== false) {
          instance._upload.progress.forEach((cb) =>
            cb({ lengthComputable: true, loaded: 50, total: 100 } as ProgressEvent)
          );
          instance._upload.progress.forEach((cb) =>
            cb({ lengthComputable: true, loaded: 100, total: 100 } as ProgressEvent)
          );
        }
        instance.status = options.status ? options.status() : 201;
        instance.response = options.body ? options.body() : null;
        instance._listeners.load.forEach((cb) => cb());
      });
    },
    abort() {
      instance.aborted = true;
      queueMicrotask(() => {
        instance._listeners.abort.forEach((cb) => cb());
      });
    },
  };
  return instance;
};

/**
 * Ставит заглушку на `globalThis` и возвращает список созданных экземпляров плюс снятие.
 */
export const installXhrStub = (options: XhrStubOptions = {}) => {
  const instances: XhrStubInstance[] = [];
  const original = globalThis.XMLHttpRequest;
  (globalThis as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = function () {
    const instance = createXhrStub(options);
    instances.push(instance);
    return instance;
  } as unknown as typeof XMLHttpRequest;
  return {
    instances,
    restore: () => {
      globalThis.XMLHttpRequest = original;
    },
  };
};
