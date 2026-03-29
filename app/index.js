// Entry point - polyfill must run before ANY other imports
// Fixes "Cannot assign to property 'protocol' which has only a getter" in RN 0.81 Hermes

if (typeof URL !== 'undefined') {
  const _URL = URL;
  globalThis.URL = function URL(url, base) {
    const parsed = new _URL(url, base);
    // Return a plain object with writable properties
    const obj = {
      hash: parsed.hash || '',
      host: parsed.host || '',
      hostname: parsed.hostname || '',
      href: parsed.href || '',
      origin: parsed.origin || '',
      password: parsed.password || '',
      pathname: parsed.pathname || '',
      port: parsed.port || '',
      protocol: parsed.protocol || '',
      search: parsed.search || '',
      searchParams: parsed.searchParams,
      username: parsed.username || '',
      toString() { return this.href; },
      toJSON() { return this.href; },
    };
    return obj;
  };
  globalThis.URL.prototype = _URL.prototype;
  if (_URL.createObjectURL) globalThis.URL.createObjectURL = _URL.createObjectURL.bind(_URL);
  if (_URL.revokeObjectURL) globalThis.URL.revokeObjectURL = _URL.revokeObjectURL.bind(_URL);
  if (_URL.canParse) globalThis.URL.canParse = _URL.canParse.bind(_URL);
}

// Now import the actual app
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
