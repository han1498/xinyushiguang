const { sendChat, setConfig } = require("../../utils/ai")
const { loadComponent4 } = require("../../utils/component4-persist")
const { formatTimeText, safeGetStorage, safeSetStorage, generateId } = require("../../utils/util")
const { STORAGE_KEYS, DEFAULT_PRESET } = require("../../utils/config")

Page({
  data: {
    posts: [],
    publishing: false
  },

  onLoad() {
    this._loadPosts()
  },

  onShow() {
    this._loadPosts()
    this._refreshAiConfig()
  },

  _refreshAiConfig() {
    const component4Loaded = loadComponent4({
      getItem: (k) => safeGetStorage(k, undefined),
      setItem: (k, v) => safeSetStorage(k, v)
    })
    if (component4Loaded.ok) {
      const data = component4Loaded.data
      if (data.serverConfig.baseUrl && data.serverConfig.token) {
        setConfig({ baseUrl: data.serverConfig.baseUrl, apiKey: data.serverConfig.token })
      }
    }
  },

  _loadPosts() {
    const posts = safeGetStorage(STORAGE_KEYS.PLAZA_POSTS, [])
    this.setData({ posts: this._decoratePosts(posts) })
  },

  _decoratePosts(posts) {
    const list = Array.isArray(posts) ? posts : []
    const copied = list.map((p) => ({
      ...p,
      timeText: formatTimeText(p?.createdAt || 0)
    }))
    copied.sort((a, b) => (b?.createdAt || 0) - (a?.createdAt || 0))
    return copied
  },

  onPlazaAdd() {
    if (this.data.publishing) return
    wx.showModal({
      title: "发布动态",
      editable: true,
      placeholderText: "写一句想说的话…",
      confirmText: "发布",
      success: (res) => {
        if (!res?.confirm) return
        const text = (res?.content || "").trim()
        if (!text) return
        const post = {
          id: generateId("p"),
          createdAt: Date.now(),
          content: text,
          reply: "",
          liked: false
        }
        const posts = safeGetStorage(STORAGE_KEYS.PLAZA_POSTS, [])
        posts.push(post)
        safeSetStorage(STORAGE_KEYS.PLAZA_POSTS, posts)
        this.setData({ posts: this._decoratePosts(posts) })
        this._generateReply(post.id, post.content)
      }
    })
  },

  async _generateReply(postId, content) {
    this.setData({ publishing: true })
    try {
      const preset = safeGetStorage(STORAGE_KEYS.LEGACY_PRESET, DEFAULT_PRESET.preset)
      const rules = safeGetStorage(STORAGE_KEYS.LEGACY_RULES, DEFAULT_PRESET.promptRules)
      const identity = preset.identity || "百合花精"
      const boundaries = preset.boundaries || "不输出敏感信息"

      const prompt = `用户发了一条动态：${content}，请作为它的${identity}给它写一段温暖的评论。`
      const messages = [
        { role: "system", content: `AI基础身份：${identity}。能力边界：${boundaries}。用户提示词要求：${rules}。` },
        { role: "user", content: prompt }
      ]
      const reply = await sendChat({ messages })
      const posts = safeGetStorage(STORAGE_KEYS.PLAZA_POSTS, [])
      const updated = posts.map((p) => (p?.id === postId ? { ...p, reply } : p))
      safeSetStorage(STORAGE_KEYS.PLAZA_POSTS, updated)
      this.setData({ posts: this._decoratePosts(updated) })
    } catch (e) {
      console.error("[plaza] generate reply failed:", e)
    } finally {
      this.setData({ publishing: false })
    }
  },

  onPlazaToggleLike(e) {
    const id = e?.currentTarget?.dataset?.id || ""
    if (!id) return
    const posts = safeGetStorage(STORAGE_KEYS.PLAZA_POSTS, [])
    const updated = posts.map((p) => (p?.id === id ? { ...p, liked: !p.liked } : p))
    safeSetStorage(STORAGE_KEYS.PLAZA_POSTS, updated)
    this.setData({ posts: this._decoratePosts(updated) })
  },

  onPlazaDelete(e) {
    const id = e?.currentTarget?.dataset?.id || ""
    if (!id) return
    const posts = safeGetStorage(STORAGE_KEYS.PLAZA_POSTS, [])
    const updated = posts.filter((p) => p?.id !== id)
    safeSetStorage(STORAGE_KEYS.PLAZA_POSTS, updated)
    this.setData({ posts: this._decoratePosts(updated) })
  }
})
