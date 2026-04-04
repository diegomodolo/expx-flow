// libwebphone.js placeholder — substituir pelo arquivo real da API4Com
// Download em: https://docs.api4com.com (seção Webphone SIP)
window.libwebphone = class libwebphone {
  constructor(config) { this._config = config; this._listeners = {}; }
  on(event, cb) { this._listeners[event] = cb; }
  getUserAgent() { return null; }
};
