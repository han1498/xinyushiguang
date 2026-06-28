const {
  buildMonthCells,
  getTodayYMD,
  formatTimeText,
  safeGetStorage,
  safeSetStorage,
  calcAge
} = require("../../utils/util")
const { STORAGE_KEYS, CONSTANTS } = require("../../utils/config")

Page({
  data: {
    activeTab: "memory",
    weekLabels: ["日", "一", "二", "三", "四", "五", "六"],
    year: 0,
    month: 0,
    monthTitle: "",
    selectedDate: "",
    calendarCells: [],
    calendarVisible: true,

    memoryItems: [],
    calendarEvents: [],
    reminderList: [],
    badgeCounts: { memory: 0, event: 0, reminder: 0 },

    profile: { name: "", birthday: "", personality: "" },
    aiConfig: { persona: "" },
    dayGroups: []
  },

  onLoad() {
    const today = getTodayYMD()
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    this.setData({
      year,
      month,
      monthTitle: `${year}年${month}月`,
      selectedDate: today,
      calendarCells: buildMonthCells(year, month, today)
    })

    this._loadAllData()
  },

  onShow() {
    this._loadAllData()
  },

  _loadAllData() {
    const memoryItems = safeGetStorage(STORAGE_KEYS.MEMORY_ITEMS, [])
    const calendarEvents = safeGetStorage(STORAGE_KEYS.CALENDAR_EVENTS, [])
    const reminders = safeGetStorage(STORAGE_KEYS.REMINDERS, [])
    const profile = safeGetStorage(STORAGE_KEYS.USER_PROFILE, { name: "", birthday: "", personality: "" })
    const aiConfig = safeGetStorage(STORAGE_KEYS.AI_CONFIG, { persona: "" })

    this.setData({
      memoryItems: this._decorateMemoryItems(memoryItems),
      calendarEvents: this._decorateCalendarEvents(calendarEvents),
      reminderList: this._decorateReminders(reminders),
      badgeCounts: this._buildBadgeCounts(memoryItems, calendarEvents, reminders),
      profile,
      aiConfig,
      dayGroups: this._buildDayGroups()
    })
  },

  _decorateMemoryItems(items) {
    const list = Array.isArray(items) ? items : []
    const copied = list.map((m) => ({
      ...m,
      timeText: formatTimeText(m?.createdAt || 0)
    }))
    copied.sort((a, b) => (b?.createdAt || 0) - (a?.createdAt || 0))
    return copied
  },

  _decorateCalendarEvents(events) {
    const list = Array.isArray(events) ? events : []
    const today = getTodayYMD()
    const copied = list.map((e) => ({
      ...e,
      timeText: formatTimeText(e?.createdAt || 0),
      isPast: e.date < today,
      isToday: e.date === today
    }))
    copied.sort((a, b) => a.date > b.date ? 1 : (a.date < b.date ? -1 : 0))
    return copied
  },

  _decorateReminders(reminders) {
    const list = Array.isArray(reminders) ? reminders : []
    const now = new Date()
    const copied = list.map((r) => {
      const isPast = r.done || (r.dateTime && new Date(r.dateTime) < now)
      return {
        ...r,
        timeText: formatTimeText(r?.createdAt || 0),
        isPast
      }
    })
    copied.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      return (b?.createdAt || 0) - (a?.createdAt || 0)
    })
    return copied
  },

  _buildBadgeCounts(memoryItems, calendarEvents, reminders) {
    return {
      memory: (memoryItems || []).length,
      event: (calendarEvents || []).length,
      reminder: (reminders || []).filter((r) => !r.done).length
    }
  },

  _buildDayGroups() {
    const all = safeGetStorage(STORAGE_KEYS.CHAT_HISTORY, [])
    const arr = Array.isArray(all) ? all : []
    const groups = {}
    for (const h of arr) {
      if (!h || !h.createdAt) continue
      const d = new Date(h.createdAt)
      const dayKey = `${d.getFullYear()}-${(`0${d.getMonth() + 1}`).slice(-2)}-${(`0${d.getDate()}`).slice(-2)}`
      if (!groups[dayKey]) {
        groups[dayKey] = { date: dayKey, list: [] }
      }
      groups[dayKey].list.push({
        id: h.id,
        role: h.role,
        content: h.content,
        timeText: `${(`0${d.getHours()}`).slice(-2)}:${(`0${d.getMinutes()}`).slice(-2)}`,
        createdAt: h.createdAt
      })
    }
    let dayArr = Object.keys(groups).map((k) => ({
      date: k,
      expanded: false,
      list: groups[k].list
    }))
    dayArr.sort((a, b) => a.date > b.date ? -1 : 1)
    if (dayArr.length > 8) dayArr = dayArr.slice(0, 8)
    return dayArr
  },

  onTabChange(e) {
    const tab = e?.currentTarget?.dataset?.tab || "memory"
    this.setData({ activeTab: tab })
  },

  onPrevMonth() {
    let y = this.data.year
    let m = this.data.month - 1
    if (m <= 0) {
      y -= 1
      m = 12
    }
    const cells = buildMonthCells(y, m, this.data.selectedDate)
    this.setData({
      year: y,
      month: m,
      monthTitle: `${y}年${m}月`,
      calendarCells: cells
    })
  },

  onNextMonth() {
    let y = this.data.year
    let m = this.data.month + 1
    if (m >= 13) {
      y += 1
      m = 1
    }
    const cells = buildMonthCells(y, m, this.data.selectedDate)
    this.setData({
      year: y,
      month: m,
      monthTitle: `${y}年${m}月`,
      calendarCells: cells
    })
  },

  onSelectDate(e) {
    const date = e?.currentTarget?.dataset?.date || ""
    if (!date) return
    const cells = buildMonthCells(this.data.year, this.data.month, date)
    this.setData({
      selectedDate: date,
      calendarCells: cells
    })
  },

  onToggleCalendar() {
    this.setData({ calendarVisible: !this.data.calendarVisible })
  },

  onDeleteMemory(e) {
    const id = e?.currentTarget?.dataset?.id || ""
    if (!id) return
    let items = safeGetStorage(STORAGE_KEYS.MEMORY_ITEMS, [])
    items = items.filter((m) => m.id !== id)
    safeSetStorage(STORAGE_KEYS.MEMORY_ITEMS, items)
    const events = safeGetStorage(STORAGE_KEYS.CALENDAR_EVENTS, [])
    const reminders = safeGetStorage(STORAGE_KEYS.REMINDERS, [])
    this.setData({
      memoryItems: this._decorateMemoryItems(items),
      badgeCounts: this._buildBadgeCounts(items, events, reminders)
    })
  },

  onDeleteEvent(e) {
    const id = e?.currentTarget?.dataset?.id || ""
    if (!id) return
    let events = safeGetStorage(STORAGE_KEYS.CALENDAR_EVENTS, [])
    events = events.filter((ev) => ev.id !== id)
    safeSetStorage(STORAGE_KEYS.CALENDAR_EVENTS, events)
    const memoryItems = safeGetStorage(STORAGE_KEYS.MEMORY_ITEMS, [])
    const reminders = safeGetStorage(STORAGE_KEYS.REMINDERS, [])
    this.setData({
      calendarEvents: this._decorateCalendarEvents(events),
      badgeCounts: this._buildBadgeCounts(memoryItems, events, reminders)
    })
  },

  onDeleteReminder(e) {
    const id = e?.currentTarget?.dataset?.id || ""
    if (!id) return
    let reminders = safeGetStorage(STORAGE_KEYS.REMINDERS, [])
    reminders = reminders.filter((r) => r.id !== id)
    safeSetStorage(STORAGE_KEYS.REMINDERS, reminders)
    const memoryItems = safeGetStorage(STORAGE_KEYS.MEMORY_ITEMS, [])
    const events = safeGetStorage(STORAGE_KEYS.CALENDAR_EVENTS, [])
    this.setData({
      reminderList: this._decorateReminders(reminders),
      badgeCounts: this._buildBadgeCounts(memoryItems, events, reminders)
    })
  },

  onReminderToggle(e) {
    const id = e?.currentTarget?.dataset?.id || ""
    if (!id) return
    let reminders = safeGetStorage(STORAGE_KEYS.REMINDERS, [])
    reminders = reminders.map((r) => r.id === id ? { ...r, done: !r.done } : r)
    safeSetStorage(STORAGE_KEYS.REMINDERS, reminders)
    const memoryItems = safeGetStorage(STORAGE_KEYS.MEMORY_ITEMS, [])
    const events = safeGetStorage(STORAGE_KEYS.CALENDAR_EVENTS, [])
    this.setData({
      reminderList: this._decorateReminders(reminders),
      badgeCounts: this._buildBadgeCounts(memoryItems, events, reminders)
    })
  },

  onProfileInput(e) {
    const key = e?.currentTarget?.dataset?.key
    if (!key) return
    const value = e?.detail?.value || ""
    const next = { ...(this.data.profile || {}) }
    next[key] = value
    this.setData({ profile: next })
  },

  onProfileBirthdayChange(e) {
    const value = e?.detail?.value || ""
    const next = { ...(this.data.profile || {}) }
    next.birthday = value
    this.setData({ profile: next })
  },

  onSaveProfile() {
    const profile = this.data.profile || { name: "", birthday: "", personality: "" }
    safeSetStorage(STORAGE_KEYS.USER_PROFILE, profile)
    wx.showToast({ title: "档案已保存", icon: "success", duration: 1500 })
  },

  onAiConfigInput(e) {
    const value = e?.detail?.value || ""
    const next = { ...(this.data.aiConfig || {}) }
    next.persona = value
    this.setData({ aiConfig: next })
  },

  onSaveAiConfig() {
    const cfg = this.data.aiConfig || { persona: "" }
    safeSetStorage(STORAGE_KEYS.AI_CONFIG, cfg)
    wx.showToast({ title: "记忆已保存", icon: "success", duration: 1500 })
  },

  onToggleDay(e) {
    const date = e?.currentTarget?.dataset?.date || ""
    if (!date) return
    const groups = (this.data.dayGroups || []).map((g) => {
      if (g.date === date) return { ...g, expanded: !g.expanded }
      return g
    })
    this.setData({ dayGroups: groups })
  },

  onDeleteDay(e) {
    const date = e?.currentTarget?.dataset?.date || ""
    if (!date) return

    wx.showModal({
      title: "删除确认",
      content: `确定删除 ${date} 的所有聊天记录吗？`,
      confirmText: "删除",
      confirmColor: "#c86450",
      success: (res) => {
        if (!res?.confirm) return
        const all = safeGetStorage(STORAGE_KEYS.CHAT_HISTORY, [])
        const arr = Array.isArray(all) ? all : []
        const kept = arr.filter((h) => {
          if (!h || !h.createdAt) return true
          const d = new Date(h.createdAt)
          const dayKey = `${d.getFullYear()}-${(`0${d.getMonth() + 1}`).slice(-2)}-${(`0${d.getDate()}`).slice(-2)}`
          return dayKey !== date
        })
        safeSetStorage(STORAGE_KEYS.CHAT_HISTORY, kept)
        this.setData({ dayGroups: this._buildDayGroups() })
        wx.showToast({ title: "已删除", icon: "success", duration: 1000 })
      }
    })
  }
})
