const { sendChat, setConfig } = require("../../utils/ai")
const { loadComponent4 } = require("../../utils/component4-persist")
const {
  markdownToNodes,
  pickEmoji,
  safeGetStorage,
  safeSetStorage,
  deduplicateItems,
  generateId,
  calcAge
} = require("../../utils/util")
const {
  DEFAULT_ASSETS,
  DEFAULT_PRESET,
  CONSTANTS,
  STORAGE_KEYS,
  NO_HEADER_MD_RULE,
  INLINE_EXTRACT_PROMPT
} = require("../../utils/config")
const { getAssets, initStore } = require("../../utils/store")

function normalizeAssetPath(value, fallback) {
  if (typeof value === "string" && value.indexOf("/images/") === 0) return value
  if (typeof value === "string" && value.indexOf("https://") === 0) return value
  return fallback
}

Page({
  data: {
    bgImage: "",
    topFrameImg: "",
    btn1Img: "",
    btn2Img: "",
    btn3Img: "",
    btn4Img: "",

    splashVisible: true,
    splashFading: false,

    topEmoji: "(｡•̀ᴗ•́)و",

    inputText: "",
    chatList: [],
    scrollIntoView: "",
    sending: false,

    editVisible: false,
    editId: "",
    editText: ""
  },

  onLoad() {
    this._destroyed = false
    this._pageReady = false
    this._pendingData = null
    this._extracting = false

    initStore()
    const storedAssets = getAssets()

    const assets = {
      bgImage: normalizeAssetPath(storedAssets.bgImage, DEFAULT_ASSETS.bgImage),
      topFrameImg: normalizeAssetPath(storedAssets.topFrameImg, DEFAULT_ASSETS.topFrameImg),
      btn1Img: normalizeAssetPath(storedAssets.btn1Img, DEFAULT_ASSETS.btn1Img),
      btn2Img: normalizeAssetPath(storedAssets.btn2Img, DEFAULT_ASSETS.btn2Img),
      btn3Img: normalizeAssetPath(storedAssets.btn3Img, DEFAULT_ASSETS.btn3Img),
      btn4Img: normalizeAssetPath(storedAssets.btn4Img, DEFAULT_ASSETS.btn4Img)
    }

    const component4Loaded = loadComponent4({
      getItem: (k) => safeGetStorage(k, undefined),
      setItem: (k, v) => safeSetStorage(k, v)
    })
    const component4 = component4Loaded.ok
      ? component4Loaded.data
      : { preset: { identity: "", boundaries: "" }, promptRules: "", serverConfig: { baseUrl: "", token: "" }, updatedAt: 0 }
    this._preset = component4.preset.identity ? component4.preset : DEFAULT_PRESET.preset
    this._promptRules = component4.promptRules || DEFAULT_PRESET.promptRules
    this._serverConfig = component4.serverConfig.baseUrl ? component4.serverConfig : DEFAULT_PRESET.serverConfig
    if (this._serverConfig.baseUrl && this._serverConfig.token) {
      setConfig({ baseUrl: this._serverConfig.baseUrl, apiKey: this._serverConfig.token })
    }

    this._userProfile = safeGetStorage(STORAGE_KEYS.USER_PROFILE, { name: "", birthday: "", personality: "" })
    this._aiConfig = safeGetStorage(STORAGE_KEYS.AI_CONFIG, { persona: "" })
    this._memoryItems = safeGetStorage(STORAGE_KEYS.MEMORY_ITEMS, [])
    this._calendarEvents = safeGetStorage(STORAGE_KEYS.CALENDAR_EVENTS, [])
    this._reminders = safeGetStorage(STORAGE_KEYS.REMINDERS, [])

    const history = safeGetStorage(STORAGE_KEYS.CHAT_HISTORY, [])
    this._messages = history.map((m) => ({ id: m.id, role: m.role, content: m.content }))
    this._chatList = history.map((m) => ({ id: m.id, role: m.role, content: m.content, nodes: markdownToNodes(m.content) }))

    this._initialData = {
      ...assets,
      chatList: this._chatList,
      scrollIntoView: this._chatList.length ? this._chatList[this._chatList.length - 1].id : ""
    }
  },

  onReady() {
    this._pageReady = true
    this._safeSetData(this._initialData)
    this._loadEmojiFonts()

    clearTimeout(this._splashFadeTimer)
    clearTimeout(this._splashRemoveTimer)
    this._splashFadeTimer = setTimeout(() => {
      this._safeSetData({ splashFading: true })
      this._splashRemoveTimer = setTimeout(() => {
        this._safeSetData({ splashVisible: false })
      }, 800)
    }, CONSTANTS.SPLASH_DURATION)
  },

  onShow() {
    const component4Loaded = loadComponent4({
      getItem: (k) => safeGetStorage(k, undefined),
      setItem: (k, v) => safeSetStorage(k, v)
    })
    if (component4Loaded.ok) {
      const data = component4Loaded.data
      if (data.serverConfig.baseUrl && data.serverConfig.token) {
        setConfig({ baseUrl: data.serverConfig.baseUrl, apiKey: data.serverConfig.token })
        this._serverConfig = data.serverConfig
        this._preset = data.preset.identity ? data.preset : DEFAULT_PRESET.preset
        this._promptRules = data.promptRules || DEFAULT_PRESET.promptRules
      }
    }
  },

  _loadEmojiFonts() {
    wx.loadFontFace({
      family: 'NotoSans',
      source: 'url("https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@5.0.18/files/noto-sans-latin-400-normal.woff2")',
      global: true,
      fail: () => {}
    })
    wx.loadFontFace({
      family: 'NotoSansSymbols2',
      source: 'url("https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-symbols-2@5.0.7/files/noto-sans-symbols-2-latin-400-normal.woff2")',
      global: true,
      fail: () => {}
    })
  },

  _safeSetData(patch) {
    if (this._destroyed) return
    if (!patch || typeof patch !== "object") return

    if (!this._pageReady) {
      this._pendingData = { ...(this._pendingData || {}), ...patch }
      return
    }

    if (this._pendingData) {
      const merged = { ...this._pendingData, ...patch }
      this._pendingData = null
      this.setData(merged)
      return
    }

    this.setData(patch)
  },

  onInputChange(e) {
    const value = e?.detail?.value || ""
    this._safeSetData({ inputText: value })
  },

  async sendMessage() {
    const raw = this.data.inputText || ""
    const content = raw.trim()
    if (!content) return
    if (this.data.sending) return

    this._safeSetData({ sending: true, inputText: "" })
    this._pushLocalMessage("user", content)
    this._extractFromMessage(content)

    try {
      const apiMessages = this._buildApiMessages(this._messages)
      if (!apiMessages) {
        this._safeSetData({ sending: false })
        return
      }
      const reply = await sendChat({ messages: apiMessages })
      this._pushLocalMessage("assistant", reply)
    } catch (e) {
      console.error("[chat] send failed:", e)
    } finally {
      this._safeSetData({ sending: false })
    }
  },

  _pushLocalMessage(role, content) {
    this._messages = Array.isArray(this._messages) ? this._messages : []
    this._chatList = Array.isArray(this._chatList) ? this._chatList : []

    const id = generateId("m")

    const msg = { id, role, content }
    this._messages.push(msg)
    this._chatList.push({ ...msg, nodes: markdownToNodes(content) })

    this._safeSetData({ topEmoji: pickEmoji(content) })
    this._trimHistory()
    const lastId = this._chatList.length ? this._chatList[this._chatList.length - 1].id : ""
    this._appendChatHistory(id, role, content)

    this._safeSetData({
      chatList: this._chatList,
      scrollIntoView: lastId
    })
  },

  _trimHistory() {
    const MAX_CHARS = CONSTANTS.MAX_CHAT_CHARS
    let total = 0
    for (let i = this._messages.length - 1; i >= 0; i--) {
      total += (this._messages[i]?.content || "").length
      if (total > MAX_CHARS) {
        this._messages = this._messages.slice(i + 1)
        this._chatList = this._chatList.slice(i + 1)
        return
      }
    }
  },

  _buildApiMessages(localMessages) {
    const base = Array.isArray(localMessages) ? localMessages : []
    const cleaned = base.map((m) => ({ role: m?.role, content: m?.content })).filter((m) => m.role && m.content !== undefined)

    const currentRules = typeof this.data.promptRules === "string" ? this.data.promptRules : ""
    const promptRules = (currentRules || safeGetStorage(STORAGE_KEYS.LEGACY_RULES, "") || this._promptRules || "").trim()
    if (!promptRules) {
      wx.showModal({
        title: "提示",
        content: "请先在设置中填写并保存提示词规则后再使用AI回复。",
        showCancel: false,
        confirmText: "知道了"
      })
      return null
    }

    const preset = this._preset || {}
    const identity = `${preset.identity || ""}`.trim()
    const boundaries = `${preset.boundaries || ""}`.trim()
    if (!identity || !boundaries) {
      wx.showModal({
        title: "提示",
        content: "请先在设置中填写并保存AI设定（身份、能力边界）后再使用AI回复。",
        showCancel: false,
        confirmText: "知道了"
      })
      return null
    }

    const persona = this._buildSystemMessage()
    const sys = [{ role: "system", content: NO_HEADER_MD_RULE }]
    sys.push({
      role: "system",
      content: `在生成任何回复前，你必须严格校验并遵循以下用户要求与约束。AI基础身份：${identity}。能力边界：${boundaries}。用户提示词要求：${promptRules}。`
    })
    if (persona) sys.push({ role: "system", content: persona })

    const MAX_CHARS = CONSTANTS.MAX_CHAT_CHARS
    let sysTotal = 0
    for (const s of sys) {
      sysTotal += (s.content || "").length
    }
    let avail = MAX_CHARS - sysTotal
    const trimmed = []
    for (let i = cleaned.length - 1; i >= 0; i--) {
      const c = (cleaned[i]?.content || "").length
      if (c > avail) break
      avail -= c
      trimmed.unshift(cleaned[i])
    }
    return sys.concat(trimmed)
  },

  _buildSystemMessage() {
    const profile = this._userProfile || safeGetStorage(STORAGE_KEYS.USER_PROFILE, { name: "", birthday: "", personality: "" })
    const cfg = this._aiConfig || safeGetStorage(STORAGE_KEYS.AI_CONFIG, { persona: "" })
    const name = (profile?.name || "").trim() || "用户"
    const age = calcAge(profile?.birthday || "")
    const personality = (profile?.personality || "").trim()
    const memory = (cfg?.persona || "").trim()

    const parts = [
      `你是一个温暖、美好的百合精灵。`,
      `你的对话对象是${name}${age ? `，他今年${age}岁` : ""}。`
    ]
    if (personality) parts.push(`对方的性格与偏好：${personality}。`)
    if (memory) parts.push(`关于对方你记忆中的信息：\n${memory}`)
    parts.push("请使用自然、温暖、简洁的中文回应。")
    return parts.join("")
  },

  _appendChatHistory(id, role, content) {
    const entry = {
      id: id || generateId("h"),
      role,
      content,
      createdAt: Date.now()
    }
    const history = safeGetStorage(STORAGE_KEYS.CHAT_HISTORY, [])
    history.push(entry)
    const trimmed = history.slice(-CONSTANTS.MAX_CHAT_HISTORY)
    safeSetStorage(STORAGE_KEYS.CHAT_HISTORY, trimmed)
  },

  _extractFromMessage(content) {
    if (!content || this._extracting) return
    this._extracting = true

    const prompt = [
      { role: "system", content: INLINE_EXTRACT_PROMPT },
      { role: "user", content }
    ]

    sendChat({ messages: prompt })
      .then((reply) => {
        this._extracting = false
        const clean = reply.trim()
        if (!clean) return

        let parsed
        try {
          const jsonStart = clean.indexOf("{")
          const jsonEnd = clean.lastIndexOf("}")
          if (jsonStart === -1 || jsonEnd === -1) return
          parsed = JSON.parse(clean.slice(jsonStart, jsonEnd + 1))
        } catch (e) {
          return
        }

        const memories = Array.isArray(parsed.memories) ? parsed.memories : []
        const events = Array.isArray(parsed.events) ? parsed.events : []
        const reminders = Array.isArray(parsed.reminders) ? parsed.reminders : []

        if (memories.length > 0) {
          const current = safeGetStorage(STORAGE_KEYS.MEMORY_ITEMS, [])
          const added = deduplicateItems(current, memories, "content")
          if (added.length > 0) {
            const next = current.concat(added)
            safeSetStorage(STORAGE_KEYS.MEMORY_ITEMS, next)
            this._memoryItems = next

            const personaText = memories.map((m) => m.content).join("；")
            const aiConfig = this._aiConfig || safeGetStorage(STORAGE_KEYS.AI_CONFIG, { persona: "" })
            const currentPersona = aiConfig?.persona?.trim() || ""
            const nextPersona = currentPersona ? `${currentPersona}\n${personaText}` : personaText
            this._aiConfig = { persona: nextPersona }
            safeSetStorage(STORAGE_KEYS.AI_CONFIG, this._aiConfig)
          }
        }

        if (events.length > 0) {
          const current = safeGetStorage(STORAGE_KEYS.CALENDAR_EVENTS, [])
          const added = deduplicateItems(current, events, "title")
          if (added.length > 0) {
            const next = current.concat(added)
            safeSetStorage(STORAGE_KEYS.CALENDAR_EVENTS, next)
            this._calendarEvents = next
          }
        }

        if (reminders.length > 0) {
          const current = safeGetStorage(STORAGE_KEYS.REMINDERS, [])
          const added = deduplicateItems(current, reminders, "content")
          if (added.length > 0) {
            const next = current.concat(added)
            safeSetStorage(STORAGE_KEYS.REMINDERS, next)
            this._reminders = next
          }
        }
      })
      .catch(() => {
        this._extracting = false
      })
  },

  onEditAiMessage(e) {
    const id = e?.currentTarget?.dataset?.id || ""
    if (!id) return

    const idx = Array.isArray(this._chatList) ? this._chatList.findIndex((m) => m?.id === id) : -1
    const item = idx >= 0 ? this._chatList[idx] : null
    if (!item || item.role !== "assistant") return

    this._safeSetData({
      editVisible: true,
      editId: id,
      editText: item.content || ""
    })
  },

  onEditInput(e) {
    const value = e?.detail?.value || ""
    this._safeSetData({ editText: value })
  },

  onEditCancel() {
    this._safeSetData({
      editVisible: false,
      editId: "",
      editText: ""
    })
  },

  onEditSave() {
    const id = this.data.editId
    const nextText = (this.data.editText || "").trim()
    if (!id || !nextText) return

    const prev = (Array.isArray(this._chatList) ? this._chatList : []).find((m) => m?.id === id) || null
    const prevContent = prev?.content || ""

    const nextList = (Array.isArray(this._chatList) ? this._chatList : []).map((m) =>
      m?.id === id ? { ...m, content: nextText, nodes: markdownToNodes(nextText) } : m
    )
    this._chatList = nextList

    this._messages = (Array.isArray(this._messages) ? this._messages : []).map((m) =>
      m?.id === id ? { ...m, content: nextText } : m
    )

    const history = safeGetStorage(STORAGE_KEYS.CHAT_HISTORY, [])
    const list = Array.isArray(history) ? history : []
    const hit = list.findIndex((h) => h?.id === id)
    if (hit >= 0) {
      list[hit] = { ...list[hit], content: nextText }
    } else {
      const fallback = list.findIndex((h) => h?.role === "assistant" && h?.content === prevContent)
      if (fallback >= 0) list[fallback] = { ...list[fallback], content: nextText }
    }
    safeSetStorage(STORAGE_KEYS.CHAT_HISTORY, list)

    if (!this._destroyed && this._pageReady) {
      this.setData({
        chatList: nextList,
        editVisible: false,
        editId: "",
        editText: ""
      })
    } else {
      this._safeSetData({
        editVisible: false,
        editId: "",
        editText: ""
      })
    }
  },

  noop() {},

  onUnload() {
    this._destroyed = true
    clearTimeout(this._splashFadeTimer)
    clearTimeout(this._splashRemoveTimer)
  }
})
