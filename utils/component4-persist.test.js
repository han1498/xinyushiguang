const { loadComponent4, saveComponent4, buildSubmitUrl, validateComponent4 } = require("./component4-persist")

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assert failed")
}

function createMemoryStorage() {
  const map = new Map()
  return {
    getItem(k) {
      return map.get(k)
    },
    setItem(k, v) {
      map.set(k, v)
    },
    _dump() {
      return map
    }
  }
}

function createQuotaStorage() {
  return {
    getItem() {
      return undefined
    },
    setItem() {
      throw new Error("quota exceeded")
    }
  }
}

;(function run() {
  {
    const storage = createMemoryStorage()
    const payload = {
      preset: { identity: "百合精灵", boundaries: "不做医疗诊断" },
      promptRules: "必须分点；禁止标题",
      serverConfig: { baseUrl: "https://example.com/api", token: "t" },
      updatedAt: 123
    }
    const saved = saveComponent4(storage, payload)
    assert(saved.ok, "save should succeed")

    const loaded = loadComponent4(storage)
    assert(loaded.ok, "load should succeed")
    assert(loaded.data.preset.identity === "百合精灵", "identity should persist")
    assert(loaded.data.preset.boundaries === "不做医疗诊断", "boundaries should persist")
    assert(loaded.data.promptRules === "必须分点；禁止标题", "promptRules should persist")
    assert(loaded.data.serverConfig.baseUrl === "https://example.com/api", "server baseUrl should persist")
  }

  {
    const storage = createMemoryStorage()
    storage.setItem("ai_preset", { identity: "X", boundaries: "Y" })
    storage.setItem("prompt_rules", "R")
    storage.setItem("server_config", { baseUrl: "U", token: "K" })
    const loaded = loadComponent4(storage)
    assert(loaded.ok, "legacy load should succeed")
    assert(loaded.data.preset.identity === "X", "legacy identity")
    assert(loaded.data.promptRules === "R", "legacy rules")
    assert(loaded.data.serverConfig.baseUrl === "U", "legacy server baseUrl")
  }

  {
    const storage = createQuotaStorage()
    const saved = saveComponent4(storage, {
      preset: { identity: "A", boundaries: "B" },
      promptRules: "C"
    })
    assert(!saved.ok, "quota save should fail")
    assert(saved.error.code === "QUOTA_EXCEEDED", "should detect quota")
  }

  {
    const u = buildSubmitUrl("https://example.com/api/")
    assert(u === "https://example.com/api/component4/save", "submit url should join path")
  }

  {
    const v = validateComponent4({
      preset: { identity: "A", boundaries: "B" },
      promptRules: "R",
      serverConfig: { baseUrl: "https://x.y", token: "" }
    })
    assert(v.ok, "validate should pass")
  }

  console.log("component4-persist tests passed")
})()
