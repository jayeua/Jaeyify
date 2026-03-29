// Polyfill to fix "Cannot assign to property 'protocol' which has only a getter"
// This is needed for React Native 0.81+ where Hermes uses a strict URL implementation
// Some libraries (React Navigation, etc.) try to assign to URL properties that are read-only

if (typeof URL !== 'undefined') {
  const OriginalURL = URL;
  
  class PatchedURL {
    constructor(url, base) {
      const parsed = new OriginalURL(url, base);
      // Copy all properties as writable
      this.hash = parsed.hash;
      this.host = parsed.host;
      this.hostname = parsed.hostname;
      this.href = parsed.href;
      this.origin = parsed.origin;
      this.password = parsed.password;
      this.pathname = parsed.pathname;
      this.port = parsed.port;
      this.protocol = parsed.protocol;
      this.search = parsed.search;
      this.searchParams = parsed.searchParams;
      this.username = parsed.username;
    }

    toString() {
      return this.href;
    }

    toJSON() {
      return this.href;
    }
  }

  // Keep static methods
  PatchedURL.createObjectURL = OriginalURL.createObjectURL;
  PatchedURL.revokeObjectURL = OriginalURL.revokeObjectURL;
  PatchedURL.canParse = OriginalURL.canParse;

  globalThis.URL = PatchedURL;
}
