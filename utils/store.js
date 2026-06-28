const { safeGetStorage, safeSetStorage } = require("./util")
const { STORAGE_KEYS, DEFAULT_ASSETS } = require("./config")

const state = {
  assets: { ...DEFAULT_ASSETS },
  _listeners: {},
  _inited: false
}

function initStore() {
  if (state._inited) return
  state._inited = true

  const keys = Object.keys(DEFAULT_ASSETS)
  keys.forEach((key) => {
    const storageKey = `${STORAGE_KEYS.ASSETS_PREFIX}${key}`
    const stored = safeGetStorage(storageKey, "")
    if (stored && typeof stored === "string" && stored.indexOf("https://") === 0) {
      state.assets[key] = stored
    }
  })
}

function getAsset(key) {
  return state.assets[key] || ""
}

function setAsset(key, value) {
  if (!key) return
  state.assets[key] = value || ""
  safeSetStorage(`${STORAGE_KEYS.ASSETS_PREFIX}${key}`, state.assets[key])
  _notify("assets", state.assets)
}

function getAssets() {
  return { ...state.assets }
}

function on(event, callback) {
  if (!state._listeners[event]) {
    state._listeners[event] = []
  }
  state._listeners[event].push(callback)
  return () => off(event, callback)
}

function off(event, callback) {
  if (!state._listeners[event]) return
  state._listeners[event] = state._listeners[event].filter((fn) => fn !== callback)
}

function _notify(event, data) {
  if (!state._listeners[event]) return
  state._listeners[event].forEach((fn) => {
    try {
      fn(data)
    } catch (e) {
      console.error("[store] listener error:", e)
    }
  })
}

module.exports = {
  initStore,
  getAsset,
  setAsset,
  getAssets,
  on,
  off
}
