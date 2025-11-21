// runtime/storage.js
export function storageApi(namespace='nova64') {
  function _k(k) { return namespace + ':' + k; }
  function saveJSON(key, obj) {
    try {
      localStorage.setItem(_k(key), JSON.stringify(obj));
      return true;
    } catch(e) { return false; }
  }
  function loadJSON(key, fallback=null) {
    try {
      const s = localStorage.getItem(_k(key));
      return s ? JSON.parse(s) : fallback;
    } catch(e) { return fallback; }
  }
  function remove(key) { try { localStorage.removeItem(_k(key)); } catch(e){ /* ignore */ } }
  return {
    exposeTo(target) { Object.assign(target, { saveJSON, loadJSON, remove }); }
  };
}
