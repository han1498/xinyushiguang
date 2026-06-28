const { EMOJI_POOL, SENTIMENT_RULES } = require("./config")

function pad2(n) {
  return n < 10 ? `0${n}` : `${n}`
}

function formatYMD(year, month1, day) {
  return `${year}-${pad2(month1)}-${pad2(day)}`
}

function getTodayYMD() {
  const d = new Date()
  return formatYMD(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

function formatTimeText(ts) {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = pad2(d.getMonth() + 1)
  const day = pad2(d.getDate())
  const hh = pad2(d.getHours())
  const mm = pad2(d.getMinutes())
  return `${y}-${m}-${day} ${hh}:${mm}`
}

function buildMonthCells(year, month1, selectedDate) {
  const first = new Date(year, month1 - 1, 1)
  const startWeekday = first.getDay()
  const daysInMonth = new Date(year, month1, 0, 12).getDate()
  const cells = []
  const today = getTodayYMD()

  for (let i = 0; i < startWeekday; i++) {
    cells.push({ label: "", date: "", inMonth: false, selected: false, today: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = formatYMD(year, month1, d)
    cells.push({
      label: `${d}`,
      date,
      inMonth: true,
      selected: date === selectedDate,
      today: date === today
    })
  }
  while (cells.length < 42) {
    cells.push({ label: "", date: "", inMonth: false, selected: false, today: false })
  }
  return cells
}

function calcAge(birthdayYMD) {
  if (typeof birthdayYMD !== "string" || birthdayYMD.length < 10) return ""
  const parts = birthdayYMD.split("-")
  const y = Number(parts[0])
  const m = Number(parts[1])
  const d = Number(parts[2])
  if (!y || !m || !d) return ""

  const now = new Date()
  let age = now.getFullYear() - y
  const curM = now.getMonth() + 1
  const curD = now.getDate()
  if (curM < m || (curM === m && curD < d)) age -= 1
  return age < 0 ? "" : `${age}`
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickEmoji(text) {
  const s = `${text || ""}`.toLowerCase()

  for (const snt of SENTIMENT_RULES) {
    if (snt.keywords.some((k) => s.indexOf(k) !== -1)) {
      return pickRandom(EMOJI_POOL[snt.pool])
    }
  }

  return pickRandom(EMOJI_POOL.neutral)
}

function escapeText(text) {
  return `${text}`
}

function stripHeaderPrefix(line) {
  const m = `${line}`.match(/^\s*#{1,6}\s*(.*)$/)
  return m ? m[1] : `${line}`
}

function parseInlineMarkdown(text) {
  const nodes = []
  const s = `${text}`
  let i = 0

  const pushText = (t) => {
    if (!t) return
    nodes.push({ type: "text", text: escapeText(t) })
  }

  while (i < s.length) {
    if (s[i] === "*" && s[i + 1] === "*") {
      const end = s.indexOf("**", i + 2)
      if (end !== -1) {
        pushText(s.slice(0, i))
        const inner = s.slice(i + 2, end)
        nodes.push({ name: "strong", children: [{ type: "text", text: escapeText(inner) }] })
        const rest = s.slice(end + 2)
        return nodes.concat(parseInlineMarkdown(rest))
      }
    }
    if (s[i] === "*" && s[i + 1] !== "*") {
      const end = s.indexOf("*", i + 1)
      if (end !== -1) {
        pushText(s.slice(0, i))
        const inner = s.slice(i + 1, end)
        nodes.push({ name: "em", children: [{ type: "text", text: escapeText(inner) }] })
        const rest = s.slice(end + 1)
        return nodes.concat(parseInlineMarkdown(rest))
      }
    }
    if (s[i] === "_" && s[i + 1] !== "_") {
      const end = s.indexOf("_", i + 1)
      if (end !== -1) {
        pushText(s.slice(0, i))
        const inner = s.slice(i + 1, end)
        nodes.push({ name: "em", children: [{ type: "text", text: escapeText(inner) }] })
        const rest = s.slice(end + 1)
        return nodes.concat(parseInlineMarkdown(rest))
      }
    }
    i += 1
  }

  pushText(s)
  return nodes
}

function markdownToNodes(raw) {
  const text = `${raw || ""}`.replace(/\r\n/g, "\n")
  const lines = text.split("\n").map((l) => stripHeaderPrefix(l))
  const nodes = []
  let i = 0

  const isUl = (l) => /^\s*[-*+]\s+/.test(l)
  const isOl = (l) => /^\s*\d+\.\s+/.test(l)
  const ulText = (l) => l.replace(/^\s*[-*+]\s+/, "")
  const olText = (l) => l.replace(/^\s*\d+\.\s+/, "")

  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i += 1
      continue
    }

    if (isUl(line)) {
      const items = []
      while (i < lines.length && isUl(lines[i])) {
        const t = ulText(lines[i])
        items.push({ name: "li", children: parseInlineMarkdown(t) })
        i += 1
      }
      nodes.push({ name: "ul", children: items })
      continue
    }

    if (isOl(line)) {
      const items = []
      while (i < lines.length && isOl(lines[i])) {
        const t = olText(lines[i])
        items.push({ name: "li", children: parseInlineMarkdown(t) })
        i += 1
      }
      nodes.push({ name: "ol", children: items })
      continue
    }

    nodes.push({ name: "p", children: parseInlineMarkdown(line) })
    i += 1
  }

  if (!nodes.length) return [{ name: "p", children: [{ type: "text", text: "" }] }]
  return nodes
}

function safeGetStorage(key, fallback) {
  try {
    const v = wx.getStorageSync(key)
    return v === undefined || v === null || v === "" ? fallback : v
  } catch (e) {
    return fallback
  }
}

function safeSetStorage(key, value) {
  try {
    wx.setStorageSync(key, value)
  } catch (e) {
    console.warn("[storage] set failed:", key, e)
  }
}

function deduplicateItems(existing, newItems, keyField) {
  const existingSet = new Set(existing.map((item) => item[keyField] || item.content))
  const added = []
  for (const item of newItems) {
    const key = item[keyField] || item.content
    if (!key) continue
    if (!existingSet.has(key) && !existing.some((e) => e.content === item.content)) {
      added.push({
        id: `m_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
        ...item,
        createdAt: Date.now()
      })
    }
  }
  return added
}

function generateId(prefix) {
  return `${prefix || "id"}_${Date.now()}_${Math.floor(Math.random() * 100000)}`
}

module.exports = {
  pad2,
  formatYMD,
  getTodayYMD,
  formatTimeText,
  buildMonthCells,
  calcAge,
  pickRandom,
  pickEmoji,
  escapeText,
  stripHeaderPrefix,
  parseInlineMarkdown,
  markdownToNodes,
  safeGetStorage,
  safeSetStorage,
  deduplicateItems,
  generateId
}
