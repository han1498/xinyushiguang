const BUNDLE_KEY = "component4_bundle_v1"
const LEGACY_PRESET_KEY = "ai_preset"
const LEGACY_RULES_KEY = "prompt_rules"
const LEGACY_SERVER_KEY = "server_config"
const SUBMIT_PATH = "/component4/save"

function normalizePreset(input) {
  const preset = input && typeof input === "object" ? input : {}
  const identity = typeof preset.identity === "string" ? preset.identity : ""
  const boundaries = typeof preset.boundaries === "string" ? preset.boundaries : ""
  return { identity, boundaries }
}

function normalizeRules(input) {
  return typeof input === "string" ? input : ""
}

function normalizeServerConfig(input) {
  const cfg = input && typeof input === "object" ? input : {}
  const baseUrl = typeof cfg.baseUrl === "string" ? cfg.baseUrl : ""
  const token = typeof cfg.token === "string" ? cfg.token : ""
  return { baseUrl, token }
}

function buildSubmitUrl(baseUrl) {
  const raw = typeof baseUrl === "string" ? baseUrl.trim() : ""
  if (!raw) return ""
  const withoutTrailing = raw.endsWith("/") ? raw.slice(0, -1) : raw
  return `${withoutTrailing}${SUBMIT_PATH}`
}

function validateComponent4(payload) {
  const preset = normalizePreset(payload?.preset)
  const promptRules = normalizeRules(payload?.promptRules).trim()
  const serverConfig = normalizeServerConfig(payload?.serverConfig)
  const baseUrl = serverConfig.baseUrl.trim()

  if (!preset.identity.trim()) return { ok: false, code: "INVALID_IDENTITY", message: "请填写AI身份" }
  if (!preset.boundaries.trim()) return { ok: false, code: "INVALID_BOUNDARIES", message: "请填写能力边界" }
  if (!promptRules) return { ok: false, code: "INVALID_RULES", message: "请填写提示词规则" }
  if (!baseUrl) return { ok: false, code: "INVALID_SERVER", message: "请填写后端地址" }
  if (!/^https?:\/\//i.test(baseUrl)) return { ok: false, code: "INVALID_SERVER", message: "后端地址需以 http(s):// 开头" }
  return { ok: true }
}

function loadComponent4(storage) {
  try {
    const raw = storage.getItem(BUNDLE_KEY)
    if (raw && typeof raw === "object") {
      const preset = normalizePreset(raw.preset)
      const promptRules = normalizeRules(raw.promptRules)
      const serverConfig = normalizeServerConfig(raw.serverConfig)
      const updatedAt = typeof raw.updatedAt === "number" ? raw.updatedAt : 0
      return { ok: true, data: { preset, promptRules, serverConfig, updatedAt }, source: "bundle" }
    }
  } catch (e) {
    return { ok: false, error: { code: "READ_BUNDLE_FAIL", message: e?.message || "read bundle fail" } }
  }

  let preset = { identity: "", boundaries: "" }
  let promptRules = ""
  let serverConfig = { baseUrl: "", token: "" }

  try {
    preset = normalizePreset(storage.getItem(LEGACY_PRESET_KEY))
  } catch (e) {
  }

  try {
    promptRules = normalizeRules(storage.getItem(LEGACY_RULES_KEY))
  } catch (e) {
  }

  try {
    serverConfig = normalizeServerConfig(storage.getItem(LEGACY_SERVER_KEY))
  } catch (e) {
  }

  return { ok: true, data: { preset, promptRules, serverConfig, updatedAt: 0 }, source: "legacy" }
}

function saveComponent4(storage, payload) {
  const preset = normalizePreset(payload?.preset)
  const promptRules = normalizeRules(payload?.promptRules)
  const serverConfig = normalizeServerConfig(payload?.serverConfig)
  const updatedAt = typeof payload?.updatedAt === "number" ? payload.updatedAt : Date.now()

  try {
    storage.setItem(BUNDLE_KEY, { v: 1, preset, promptRules, serverConfig, updatedAt })
    storage.setItem(LEGACY_PRESET_KEY, preset)
    storage.setItem(LEGACY_RULES_KEY, promptRules)
    storage.setItem(LEGACY_SERVER_KEY, serverConfig)
    return { ok: true, data: { preset, promptRules, serverConfig, updatedAt } }
  } catch (e) {
    const msg = e?.message || "save fail"
    const code =
      msg.includes("quota") || msg.includes("exceed") || msg.includes("容量") ? "QUOTA_EXCEEDED" : "WRITE_FAIL"
    return { ok: false, error: { code, message: msg } }
  }
}

module.exports = {
  loadComponent4,
  saveComponent4,
  buildSubmitUrl,
  validateComponent4
}
