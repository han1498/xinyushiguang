const {
  buildMonthCells,
  getTodayYMD,
  safeGetStorage,
  safeSetStorage,
  generateId
} = require("../../utils/util")
const { CONSTANTS, STORAGE_KEYS, PRAISE_TEXTS } = require("../../utils/config")

Page({
  data: {
    weekLabels: ["日", "一", "二", "三", "四", "五", "六"],
    year: 0,
    month: 0,
    monthTitle: "",
    selectedDate: "",
    calendarCells: [],
    calendarVisible: true,
    todoList: [],
    maxTodoPerDay: CONSTANTS.MAX_TODO_PER_DAY,
    praiseVisible: false,
    praiseText: ""
  },

  onLoad() {
    this._todoAll = safeGetStorage(STORAGE_KEYS.TODO_DATA, [])
    this._cleanExpiredTodos()

    const today = getTodayYMD()
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    this.setData({
      year,
      month,
      monthTitle: `${year}年${month}月`,
      selectedDate: today,
      calendarCells: buildMonthCells(year, month, today),
      todoList: this._filterTodoByDate(this._todoAll, today)
    })
  },

  onShow() {
    this._todoAll = safeGetStorage(STORAGE_KEYS.TODO_DATA, [])
    this._cleanExpiredTodos()
    const list = this._filterTodoByDate(this._todoAll, this.data.selectedDate)
    this.setData({ todoList: list })
  },

  _cleanExpiredTodos() {
    const today = getTodayYMD()
    const cleaned = this._todoAll.filter((t) => {
      if (!t) return false
      if (t.duration === "custom" && t.expireDate && t.expireDate < today) return false
      return true
    })
    if (cleaned.length !== this._todoAll.length) {
      this._todoAll = cleaned
      safeSetStorage(STORAGE_KEYS.TODO_DATA, this._todoAll)
    }
  },

  _filterTodoByDate(all, ymd) {
    const list = Array.isArray(all) ? all : []
    const today = getTodayYMD()
    const filtered = list.filter((t) => {
      if (!t || t.date !== ymd) return false
      if (t.duration === "custom" && t.expireDate && t.expireDate < today) return false
      return true
    })
    filtered.sort((a, b) => (b?.createdAt || 0) - (a?.createdAt || 0))
    return filtered
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
    this._todoAll = safeGetStorage(STORAGE_KEYS.TODO_DATA, [])
    const list = this._filterTodoByDate(this._todoAll, date)
    this.setData({
      selectedDate: date,
      calendarCells: cells,
      todoList: list
    })
  },

  onToggleCalendar() {
    this.setData({ calendarVisible: !this.data.calendarVisible })
  },

  onTodoAdd() {
    const curList = this.data.todoList || []
    if (curList.length >= CONSTANTS.MAX_TODO_PER_DAY) {
      wx.showModal({
        title: "提示",
        content: `每天最多添加${CONSTANTS.MAX_TODO_PER_DAY}个待办事项。`,
        showCancel: false,
        confirmText: "知道了"
      })
      return
    }
    wx.showModal({
      title: "添加待办",
      editable: true,
      placeholderText: "写下今天要做的事…",
      confirmText: "下一步",
      success: (res) => {
        if (!res?.confirm) return
        const text = (res?.content || "").trim()
        if (!text) return
        this._pickDuration(text)
      }
    })
  },

  _pickDuration(content) {
    wx.showActionSheet({
      itemList: ["永久有效", "自定义有效期"],
      success: (res) => {
        const duration = res.tapIndex === 0 ? "permanent" : "custom"
        if (duration === "permanent") {
          this._doAddTodo(content, "permanent", "")
        } else {
          wx.showModal({
            title: "自定义有效期",
            editable: true,
            placeholderText: "输入有效天数（如：7）",
            confirmText: "确定",
            success: (r) => {
              if (!r?.confirm) return
              const days = parseInt(r?.content || "", 10)
              if (!days || days < 1) {
                wx.showToast({ title: "请输入有效天数", icon: "none" })
                return
              }
              const d = new Date()
              d.setDate(d.getDate() + days)
              const yy = d.getFullYear()
              const mm = (`0${d.getMonth() + 1}`).slice(-2)
              const dd = (`0${d.getDate()}`).slice(-2)
              const expireDate = `${yy}-${mm}-${dd}`
              this._doAddTodo(content, "custom", expireDate)
            }
          })
        }
      }
    })
  },

  _doAddTodo(content, duration, expireDate) {
    const item = {
      id: generateId("t"),
      date: this.data.selectedDate || getTodayYMD(),
      content,
      done: false,
      createdAt: Date.now(),
      duration,
      expireDate
    }
    this._todoAll = safeGetStorage(STORAGE_KEYS.TODO_DATA, [])
    this._todoAll.push(item)
    safeSetStorage(STORAGE_KEYS.TODO_DATA, this._todoAll)
    this.setData({ todoList: this._filterTodoByDate(this._todoAll, item.date) })
  },

  onTodoToggle(e) {
    const id = e?.currentTarget?.dataset?.id || ""
    if (!id) return
    this._todoAll = safeGetStorage(STORAGE_KEYS.TODO_DATA, [])
    this._todoAll = this._todoAll.map((t) => {
      if (t?.id === id) {
        const newDone = !t.done
        return { ...t, done: newDone }
      }
      return t
    })
    safeSetStorage(STORAGE_KEYS.TODO_DATA, this._todoAll)
    const list = this._filterTodoByDate(this._todoAll, this.data.selectedDate)
    this.setData({ todoList: list })

    const isNowDone = this._todoAll.find((t) => t?.id === id)?.done
    if (isNowDone) {
      const allNowDone = list.every((t) => t.done)
      if (allNowDone && list.length > 0) {
        this._showAllDonePraise()
      }
    }
  },

  _showAllDonePraise() {
    const text = PRAISE_TEXTS[Math.floor(Math.random() * PRAISE_TEXTS.length)]
    this.setData({ praiseVisible: true, praiseText: text })
  },

  onPraiseClose() {
    this.setData({ praiseVisible: false })
  },

  onTodoEdit(e) {
    const id = e?.currentTarget?.dataset?.id || ""
    if (!id) return
    this._todoAll = safeGetStorage(STORAGE_KEYS.TODO_DATA, [])
    const item = this._todoAll.find((t) => t?.id === id)
    if (!item) return

    wx.showModal({
      title: "修改内容",
      editable: true,
      value: item.content,
      placeholderText: "修改待办内容…",
      confirmText: "下一步",
      success: (res) => {
        if (!res?.confirm) return
        const text = (res?.content || "").trim()
        if (!text) return
        wx.showActionSheet({
          itemList: ["永久有效", "自定义有效期"],
          success: (r) => {
            const duration = r.tapIndex === 0 ? "permanent" : "custom"
            if (duration === "permanent") {
              this._doEditTodo(id, text, "permanent", "")
            } else {
              wx.showModal({
                title: "自定义有效期",
                editable: true,
                placeholderText: "输入有效天数（如：7）",
                confirmText: "确定",
                success: (rr) => {
                  if (!rr?.confirm) return
                  const days = parseInt(rr?.content || "", 10)
                  if (!days || days < 1) {
                    wx.showToast({ title: "请输入有效天数", icon: "none" })
                    return
                  }
                  const d = new Date()
                  d.setDate(d.getDate() + days)
                  const yy = d.getFullYear()
                  const mm = (`0${d.getMonth() + 1}`).slice(-2)
                  const dd = (`0${d.getDate()}`).slice(-2)
                  const expireDate = `${yy}-${mm}-${dd}`
                  this._doEditTodo(id, text, "custom", expireDate)
                }
              })
            }
          }
        })
      }
    })
  },

  _doEditTodo(id, content, duration, expireDate) {
    this._todoAll = safeGetStorage(STORAGE_KEYS.TODO_DATA, [])
    this._todoAll = this._todoAll.map((t) =>
      t?.id === id ? { ...t, content, duration, expireDate } : t
    )
    safeSetStorage(STORAGE_KEYS.TODO_DATA, this._todoAll)
    this.setData({ todoList: this._filterTodoByDate(this._todoAll, this.data.selectedDate) })
  },

  onTodoDelete(e) {
    const id = e?.currentTarget?.dataset?.id || ""
    if (!id) return
    this._todoAll = safeGetStorage(STORAGE_KEYS.TODO_DATA, [])
    this._todoAll = this._todoAll.filter((t) => t?.id !== id)
    safeSetStorage(STORAGE_KEYS.TODO_DATA, this._todoAll)
    this.setData({ todoList: this._filterTodoByDate(this._todoAll, this.data.selectedDate) })
  },

  noop() {}
})
