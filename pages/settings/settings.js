const { setConfig } = require("../../utils/ai")
const { loadComponent4, saveComponent4 } = require("../../utils/component4-persist")
const { safeGetStorage, safeSetStorage } = require("../../utils/util")
const { DEFAULT_PRESET, CONSTANTS } = require("../../utils/config")

Page({
  data: {
    preset: { identity: "", boundaries: "" },
    promptRules: "",
    serverConfig: { baseUrl: "", token: "" },
    saveState: "idle",
    maxPromptLength: CONSTANTS.MAX_PROMPT_RULES_LENGTH
  },

  onLoad() {
    this._loadConfig()
  },

  onShow() {
    this._loadConfig()
  },

  _loadConfig() {
    const loaded = loadComponent4({
      getItem: (k) => safeGetStorage(k, undefined),
      setItem: (k, v) => safeSetStorage(k, v)
    })
    const savedPreset = loaded.ok ? loaded.data.preset : { identity: "", boundaries: "" }
    const savedRules = loaded.ok ? loaded.data.promptRules : ""
    const savedServer = loaded.ok ? loaded.data.serverConfig : { baseUrl: "", token: "" }
    const preset = savedPreset.identity ? savedPreset : DEFAULT_PRESET.preset
    const rules = savedRules || DEFAULT_PRESET.promptRules
    const serverConfig = savedServer.baseUrl ? savedServer : DEFAULT_PRESET.serverConfig
    this.setData({ preset, promptRules: rules, serverConfig, saveState: "idle" })
  },

  onPresetInput(e) {
    const key = e?.currentTarget?.dataset?.key
    if (!key) return
    const value = e?.detail?.value || ""
    const next = { ...(this.data.preset || {}) }
    next[key] = value
    this.setData({ preset: next, saveState: "idle" })
  },

  onPromptRulesInput(e) {
    const value = e?.detail?.value || ""
    this.setData({ promptRules: value, saveState: "idle" })
  },

  onServerInput(e) {
    const key = e?.currentTarget?.dataset?.key
    if (!key) return
    const value = e?.detail?.value || ""
    const next = { ...(this.data.serverConfig || { baseUrl: "", token: "" }) }
    next[key] = value
    this.setData({ serverConfig: next, saveState: "idle" })
  },

  onSave() {
    const preset = this.data.preset || { identity: "", boundaries: "" }
    const identity = (preset.identity || "").trim()
    const boundaries = (preset.boundaries || "").trim()
    const rules = (this.data.promptRules || "").trim()

    if (!identity || !boundaries) {
      wx.showModal({
        title: "提示",
        content: "请完整填写AI身份与能力边界。",
        showCancel: false,
        confirmText: "知道了"
      })
      return
    }
    if (!rules) {
      wx.showModal({
        title: "提示",
        content: "请填写提示词规则与约束。",
        showCancel: false,
        confirmText: "知道了"
      })
      return
    }
    if (rules.length > CONSTANTS.MAX_PROMPT_RULES_LENGTH) {
      wx.showModal({
        title: "提示",
        content: `提示词规则不超过${CONSTANTS.MAX_PROMPT_RULES_LENGTH}字。`,
        showCancel: false,
        confirmText: "知道了"
      })
      return
    }

    const serverConfig = this.data.serverConfig || { baseUrl: "", token: "" }
    const apiUrl = (serverConfig.baseUrl || "").trim()
    const apiKey = (serverConfig.token || "").trim()
    if (!apiUrl) {
      wx.showModal({
        title: "提示",
        content: "请填写API地址。",
        showCancel: false,
        confirmText: "知道了"
      })
      return
    }
    if (!apiKey) {
      wx.showModal({
        title: "提示",
        content: "请填写API密钥。",
        showCancel: false,
        confirmText: "知道了"
      })
      return
    }

    this.setData({ saveState: "saving" })
    wx.showLoading({ title: "保存中", mask: true })

    const res = saveComponent4(
      {
        getItem: (k) => safeGetStorage(k, undefined),
        setItem: (k, v) => safeSetStorage(k, v)
      },
      {
        preset: { identity, boundaries },
        promptRules: rules,
        serverConfig: { baseUrl: apiUrl, token: apiKey },
        updatedAt: Date.now()
      }
    )

    wx.hideLoading()

    if (!res.ok) {
      this.setData({ saveState: "error" })
      wx.showModal({
        title: "保存失败",
        content: `保存失败：${res.error.code}\n${res.error.message}`,
        showCancel: false,
        confirmText: "知道了"
      })
      return
    }

    setConfig({ baseUrl: apiUrl, apiKey })

    this.setData({
      saveState: "saved",
      preset: res.data.preset,
      promptRules: res.data.promptRules,
      serverConfig: { baseUrl: apiUrl, token: apiKey }
    })
    wx.showToast({ title: "已保存", icon: "success", duration: 1500 })

    setTimeout(() => {
      this.setData({ saveState: "idle" })
    }, 2000)
  }
})
