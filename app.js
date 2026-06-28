const { initStore, getAsset, setAsset, getAssets } = require("./utils/store")

App({
  globalData: {},

  onLaunch() {
    initStore()
    this.globalData = getAssets()
  },

  getAsset(key) {
    return getAsset(key)
  },

  setAsset(key, value) {
    setAsset(key, value)
    this.globalData = getAssets()
  }
})
