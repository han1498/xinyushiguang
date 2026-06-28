// utils.js - 工具函数模块

const EMOJI_POOL = {
  happy: ['(｡•̀ᴗ-)✧', '(◕‿◕✿)', 'ヽ(✿ﾟ▽ﾟ)ノ', "(´▽`ʃ♡ƪ)", '٩(◕‿◕｡)۶'],
  warm: ['(｡•̀ᴗ•́)و', '(´-ω-`)', '(*˘︶˘*)', '(づ｡◕‿‿◕｡)づ', '♡(◕ᴗ◕✿)'],
  sad: ['(；′⌒`)', '(｡•́︿•̀｡)', '(´;ω;`)', '(╥﹏╥)'],
  surprise: ['(⊙▽⊙)', 'Σ(°△°)', '(°ロ°)', '(°△°)'],
  encourage: ['(๑•̀ㅂ•́)و✧', '＼(^o^)／', '٩(๑❛ᴗ❛๑)۶', '(ง •̀_•́)ง'],
  think: ['(。-ω-)zzz', '(￣▽￣)', '(～﹃～)~zZ', '(￣ω￣;)'],
  neutral: ['(｡•̀ᴗ•́)و', '(´･ω･`)']
}

let _dialogCallback = null
let _dialogType = 'confirm'

function pad2(n) { return n < 10 ? `0${n}` : `${n}` }

function getTodayYMD() {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function formatTimeText(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function buildMonthCells(year, month1, selectedDate) {
  const first = new Date(year, month1 - 1, 1)
  const startWeekday = first.getDay()
  const daysInMonth = new Date(year, month1, 0, 12).getDate()
  const cells = []
  const today = getTodayYMD()
  for (let i = 0; i < startWeekday; i++) {
    cells.push({ label: '', date: '', inMonth: false, selected: false, today: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${pad2(month1)}-${pad2(d)}`
    cells.push({ label: `${d}`, date, inMonth: true, selected: date === selectedDate, today: date === today })
  }
  while (cells.length < 42) {
    cells.push({ label: '', date: '', inMonth: false, selected: false, today: false })
  }
  return cells
}

function calcAge(birthdayYMD) {
  if (!birthdayYMD || birthdayYMD.length < 10) return ''
  const parts = birthdayYMD.split('-')
  const y = Number(parts[0]), m = Number(parts[1]), d = Number(parts[2])
  if (!y || !m || !d) return ''
  const now = new Date()
  let age = now.getFullYear() - y
  const curM = now.getMonth() + 1, curD = now.getDate()
  if (curM < m || (curM === m && curD < d)) age -= 1
  return age < 0 ? '' : `${age}`
}

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function pickEmoji(text) {
  const s = `${text || ''}`.toLowerCase()
  const sentiments = [
    { keywords: ['喜欢', '爱', '温暖', '暖心', '感动', '温馨', '幸福', '甜甜'], pool: 'warm' },
    { keywords: ['开心', '太棒', '很好', '成功', '恭喜', '赞', '加油', '棒', '厉害', '优秀', '完美', '漂亮', '美好', '太好'], pool: 'happy' },
    { keywords: ['失败', '错误', '风险', '警告', '注意', '无法', '超时', '异常', '抱歉', '不建议', '请谨慎', '遗憾', '不好', '难过', '伤心', '哭'], pool: 'sad' },
    { keywords: ['真的吗', '没想到', '竟然', '意外', '惊讶', '吃惊', '哇', '天哪', '天啊', '居然'], pool: 'surprise' },
    { keywords: ['努力', '坚持', '别放弃', '加油', '你可以', '相信', '一定', '试试', '继续', '向前'], pool: 'encourage' },
    { keywords: ['睡觉', '困', '累了', '休息', '晚安', '疲惫', '休息吧'], pool: 'think' }
  ]
  for (const snt of sentiments) {
    if (snt.keywords.some(k => s.indexOf(k) !== -1)) return pickRandom(EMOJI_POOL[snt.pool])
  }
  return pickRandom(EMOJI_POOL.neutral)
}

function markdownToHtml(raw) {
  if (!raw) return ''
  let text = raw.replace(/\r\n/g, '\n')

  text = text.replace(/^\s*#{1,6}\s+/gm, '')

  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>')
  text = text.replace(/_([^_\n]+)_/g, '<em>$1</em>')

  const lines = text.split('\n')
  let inUl = false, inOl = false
  const out = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s*[-*+]\s+/.test(line)) {
      if (!inUl) { out.push('<ul>'); inUl = true }
      out.push(`<li>${line.replace(/^\s*[-*+]\s+/, '')}</li>`)
    } else {
      if (inUl) { out.push('</ul>'); inUl = false }
      if (/^\s*\d+\.\s+/.test(line)) {
        if (!inOl) { out.push('<ol>'); inOl = true }
        out.push(`<li>${line.replace(/^\s*\d+\.\s+/, '')}</li>`)
      } else {
        if (inOl) { out.push('</ol>'); inOl = false }
        out.push(line)
      }
    }
  }
  if (inUl) out.push('</ul>')
  if (inOl) out.push('</ol>')

  return out.join('\n').split(/\n{2,}/).map(p => p.trim()).filter(Boolean).map(p => {
    if (p.startsWith('<ul>') || p.startsWith('<ol>')) return p
    return `<p>${p.replace(/\n/g, '<br>')}</p>`
  }).join('')
}

function $(id) { return document.getElementById(id) }

function showToast(title, duration = 1500) {
  const el = document.getElementById('toast')
  if (!el) return
  el.textContent = title
  el.classList.add('toast--show')
  setTimeout(() => el.classList.remove('toast--show'), duration)
}

function showDialog({ title = '提示', text = '', input = false, placeholder = '', defaultValue = '', confirmText = '确定', cancelText = '取消' }) {
  const mask = $('dialogMask')
  const titleEl = $('dialogTitle')
  const textEl = $('dialogText')
  const inputEl = $('dialogInput')
  const cancelBtn = $('dialogCancelBtn')
  const confirmBtn = $('dialogConfirmBtn')
  if (!mask) return new Promise(() => {})

  _dialogType = input ? 'prompt' : 'confirm'

  titleEl.textContent = title
  textEl.textContent = text
  textEl.style.display = text ? 'block' : 'none'

  if (input) {
    inputEl.style.display = 'block'
    inputEl.placeholder = placeholder || ''
    inputEl.value = defaultValue || ''
    setTimeout(() => inputEl.focus(), 50)
  } else {
    inputEl.style.display = 'none'
  }

  cancelBtn.textContent = cancelText
  confirmBtn.textContent = confirmText
  cancelBtn.style.display = cancelText ? 'flex' : 'none'

  mask.style.display = 'flex'
  mask.style.opacity = '0'
  setTimeout(() => { mask.style.opacity = '1' }, 10)

  return new Promise(resolve => {
    _dialogCallback = resolve
  })
}

function onDialogCancel() {
  const mask = $('dialogMask')
  if (!mask) return
  mask.style.opacity = '0'
  setTimeout(() => { mask.style.display = 'none' }, 250)
  if (_dialogCallback) {
    _dialogCallback(_dialogType === 'prompt' ? null : false)
    _dialogCallback = null
  }
}

function onDialogConfirm() {
  const mask = $('dialogMask')
  const inputEl = $('dialogInput')
  if (!mask) return

  let result = true
  if (_dialogType === 'prompt') {
    result = inputEl ? inputEl.value : ''
  }

  mask.style.opacity = '0'
  setTimeout(() => { mask.style.display = 'none' }, 250)
  if (_dialogCallback) {
    _dialogCallback(result)
    _dialogCallback = null
  }
}

function safeSetData(patch) {
  if (!patch || typeof patch !== 'object') return

  if (patch.panelKey !== undefined) state.panelKey = patch.panelKey
  if (patch.panelOpen !== undefined) state.panelOpen = patch.panelOpen
  if (patch.panelTitle !== undefined) {
    state.panelTitle = patch.panelTitle
    const titleEl = $('panelTitle')
    if (titleEl) titleEl.textContent = patch.panelTitle
  }
  if (patch.panelSaveBtnVisible !== undefined) {
    state.panelSaveBtnVisible = patch.panelSaveBtnVisible
    const btn = $('panelSaveBtn')
    if (btn) btn.style.display = patch.panelSaveBtnVisible ? 'flex' : 'none'
  }
  if (patch.presetSaveState !== undefined) {
    state.presetSaveState = patch.presetSaveState
    const el = $('presetSaveState')
    if (el) el.textContent = patch.presetSaveState === 'saving' ? '…' : (patch.presetSaveState === 'saved' ? '✓' : (patch.presetSaveState === 'error' ? '✗' : ''))
  }

  if (patch.inputText !== undefined) {
    state.inputText = patch.inputText
    const el = $('chatInput')
    if (el && el.value !== patch.inputText) el.value = patch.inputText
  }
  if (patch.chatList !== undefined) state.chatList = patch.chatList
  if (patch.sending !== undefined) {
    state.sending = patch.sending
    const el = $('chatSend')
    if (el) el.classList.toggle('chat-send--disabled', patch.sending)
  }

  if (patch.topEmoji !== undefined) {
    state.topEmoji = patch.topEmoji
    const el = $('topEmoji')
    if (el) el.textContent = patch.topEmoji
  }

  if (patch.todoYear !== undefined) state.todoYear = patch.todoYear
  if (patch.todoMonth !== undefined) state.todoMonth = patch.todoMonth
  if (patch.todoMonthTitle !== undefined) state.todoMonthTitle = patch.todoMonthTitle
  if (patch.todoSelectedDate !== undefined) state.todoSelectedDate = patch.todoSelectedDate
  if (patch.todoCalendarCells !== undefined) state.todoCalendarCells = patch.todoCalendarCells
  if (patch.todoList !== undefined) state.todoList = patch.todoList
  if (patch.todoCalendarVisible !== undefined) state.todoCalendarVisible = patch.todoCalendarVisible

  if (patch.panelKey !== undefined && patch.panelKey) {
    renderPanelBody()
    openPanelAnim()
  }
}

function escHtml(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function escAttr(str) {
  if (!str) return ''
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}


// storage.js - 存储和用户系统模块

let _currentUser = null

function getUserStorageKey(key) {
  if (!_currentUser) return key
  return `user_${_currentUser.id}_${key}`
}

function storageGet(key, fallback) {
  try {
    const storageKey = getUserStorageKey(key)
    const v = localStorage.getItem(storageKey)
    return v === null || v === undefined || v === '' ? fallback : JSON.parse(v)
  } catch (e) { return fallback }
}

function storageSet(key, value) {
  try {
    const storageKey = getUserStorageKey(key)
    localStorage.setItem(storageKey, JSON.stringify(value))
  } catch (e) {}
}

function getUserRegistry() {
  try {
    const v = localStorage.getItem('user_registry')
    return v ? JSON.parse(v) : {}
  } catch (e) { return {} }
}

function saveUserRegistry(registry) {
  try { localStorage.setItem('user_registry', JSON.stringify(registry)) } catch (e) {}
}

async function hashPassword(password) {
  try {
    if (crypto && crypto.subtle && crypto.subtle.digest) {
      const encoder = new TextEncoder()
      const data = encoder.encode(password)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return 'sha256_' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    }
  } catch (e) {}
  // 备用：简单哈希
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return 'simple_' + Math.abs(hash).toString(16) + '_' + password.length
}

async function doRegister() {
  try {
    const username = $('regUsername')?.value.trim()
    const password = $('regPassword')?.value
    const password2 = $('regPassword2')?.value

    if (!username || username.length < 2) {
      showDialog({ title: '提示', text: '用户名至少2个字符', cancelText: '', confirmText: '好的' })
      return
    }
    if (!password || password.length < 4) {
      showDialog({ title: '提示', text: '密码至少4个字符', cancelText: '', confirmText: '好的' })
      return
    }
    if (password !== password2) {
      showDialog({ title: '提示', text: '两次密码不一致', cancelText: '', confirmText: '好的' })
      return
    }

    const registry = getUserRegistry()
    if (registry[username]) {
      showDialog({ title: '提示', text: '用户名已存在', cancelText: '', confirmText: '好的' })
      return
    }

    const hashedPassword = await hashPassword(password)

    const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    registry[username] = { id: userId, createdAt: Date.now() }
    saveUserRegistry(registry)

    localStorage.setItem(`user_${userId}_profile`, JSON.stringify({
      username: username,
      password: hashedPassword,
      createdAt: Date.now()
    }))

    $('regUsername').value = ''
    $('regPassword').value = ''
    $('regPassword2').value = ''
    $('loginUsername').value = username
    $('loginPassword').value = ''

    showLogin()

    setTimeout(() => {
      showDialog({ title: '注册成功', text: '欢迎加入心语拾光！请登录。', cancelText: '', confirmText: '我知道了' })
    }, 50)
  } catch (e) {
    showDialog({ title: '出错了', text: '注册失败，请重试', cancelText: '', confirmText: '好的' })
  }
}

async function doLogin() {
  try {
    const username = $('loginUsername')?.value.trim()
    const password = $('loginPassword')?.value

    if (!username || !password) {
      showDialog({ title: '提示', text: '请输入用户名和密码', cancelText: '', confirmText: '好的' })
      return
    }

    const registry = getUserRegistry()
    const userInfo = registry[username]
    if (!userInfo) {
      showDialog({ title: '提示', text: '用户不存在，请先注册', cancelText: '', confirmText: '好的' })
      return
    }

    const userKey = `user_${userInfo.id}_profile`
    let storedPassword = null
    try {
      const v = localStorage.getItem(userKey)
      if (v) {
        const userData = JSON.parse(v)
        storedPassword = userData.password
      }
    } catch (e) {}

    if (!storedPassword) {
      try {
        const savedUser = localStorage.getItem('current_user')
        if (savedUser) {
          const cu = JSON.parse(savedUser)
          if (cu.username === username) {
            storedPassword = cu.password
          }
        }
      } catch (e) {}
    }

    const hashedPassword = await hashPassword(password)

    if (storedPassword && hashedPassword !== storedPassword) {
      showDialog({ title: '提示', text: '密码错误', cancelText: '', confirmText: '好的' })
      return
    }

    const user = {
      id: userInfo.id,
      username: username,
      password: hashedPassword,
      createdAt: userInfo.createdAt
    }

    localStorage.setItem(userKey, JSON.stringify(user))
    _currentUser = user
    localStorage.setItem('current_user', JSON.stringify(user))

    _userProfile = storageGet('user_profile', { name: '', birthday: '', personality: '' })
    _aiConfig = storageGet('ai_config', { persona: '' })
    _chatHistory = storageGet('chat_history', [])
    _todoAll = storageGet('todo_data', [])
    _plazaPosts = storageGet('plaza_posts', [])
    _memoryItems = storageGet('memory_items', [])
    _calendarEvents = storageGet('calendar_events', [])
    _reminders = storageGet('reminders', [])
    _moodList = storageGet('mood_list', [])
    _notifiedReminders = storageGet('notified_reminders', [])

    showMainApp()

    setTimeout(() => {
      showDialog({ title: '登录成功', text: `欢迎回来，${username}！`, cancelText: '', confirmText: '开始聊天' })
    }, 50)
  } catch (e) {
    showDialog({ title: '出错了', text: '登录失败，请重试', cancelText: '', confirmText: '好的' })
  }
}

function doLogout() {
  _currentUser = null
  localStorage.removeItem('current_user')
  showLogin()
  setTimeout(() => {
    showDialog({ title: '已退出', text: '下次见啦～', cancelText: '', confirmText: '好的' })
  }, 100)
}

function showLogin() {
  $('loginPage').style.display = 'flex'
  $('registerPage').style.display = 'none'
  $('stage').style.display = 'none'
}

function showRegister() {
  $('loginPage').style.display = 'none'
  $('registerPage').style.display = 'flex'
  $('stage').style.display = 'none'
}

function showMainApp() {
  $('loginPage').style.display = 'none'
  $('registerPage').style.display = 'none'
  $('stage').style.display = 'flex'
}


// memo.js - 备忘录相关模块

let _editingTodoId = null

function decorateMemoryItems(items) {
  const list = Array.isArray(items) ? items : []
  return list.map(m => ({ ...m, timeText: formatTimeText(m.createdAt || 0) }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

function decorateCalendarEvents(events) {
  const list = Array.isArray(events) ? events : []
  const today = getTodayYMD()
  return list.map(e => ({
    ...e,
    timeText: formatTimeText(e.createdAt || 0),
    isPast: e.date < today,
    isToday: e.date === today
  })).sort((a, b) => a.date > b.date ? 1 : (a.date < b.date ? -1 : 0))
}

function decorateReminders(reminders) {
  const list = Array.isArray(reminders) ? reminders : []
  const now = new Date()
  return list.map(r => {
    let displayTime = r.timeText || ''
    if (r.dateTime) {
      const parts = r.dateTime.split(' ')
      if (parts.length >= 2) {
        const datePart = parts[0]
        const timePart = parts[1]
        if (datePart) {
          const d = datePart.split('-')
          if (d.length === 3) {
            displayTime = `${parseInt(d[1])}月${parseInt(d[2])}日 ${timePart || ''}`
          }
        }
      } else {
        displayTime = r.dateTime
      }
    }
    return {
      ...r,
      displayTime,
      isPast: r.done || (r.dateTime && new Date(r.dateTime) < now)
    }
  }).sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    if (!a.done && !b.done && a.dateTime && b.dateTime) {
      return new Date(a.dateTime) - new Date(b.dateTime)
    }
    return (b.createdAt || 0) - (a.createdAt || 0)
  })
}

function buildMemoBadgeCounts() {
  return {
    memory: (_memoryItems || []).length,
    todo: (_todoAll || []).filter(t => !t.done).length,
    event: (_calendarEvents || []).length
  }
}

function filterTodoByDate(all, ymd) {
  const today = getTodayYMD()
  return all.filter(t => {
    if (!t || t.date !== ymd) return false
    if (t.duration === 'custom' && t.expireDate && t.expireDate < today) return false
    return true
  }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

function cleanExpiredTodos() {
  const today = getTodayYMD()
  const cleaned = _todoAll.filter(t => {
    if (!t) return false
    if (t.duration === 'custom' && t.expireDate && t.expireDate < today) return false
    return true
  })
  if (cleaned.length !== _todoAll.length) {
    _todoAll = cleaned
    storageSet('todo_data', _todoAll)
  }
}

function migrateRemindersToTodos() {
  const migrated = storageGet('reminders_migrated', false)
  if (migrated) return

  const oldReminders = storageGet('reminders', [])
  if (!Array.isArray(oldReminders) || oldReminders.length === 0) {
    storageSet('reminders_migrated', true)
    return
  }

  const todos = storageGet('todo_data', [])
  const existingContents = new Set(todos.map(t => t.content))

  oldReminders.forEach(r => {
    if (!r.content || existingContents.has(r.content)) return
    const dateTime = r.dateTime || ''
    let date = getTodayYMD()
    if (dateTime && dateTime.length >= 10) {
      date = dateTime.slice(0, 10)
    }
    todos.push({
      id: r.id || `t_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      date,
      content: r.content,
      done: !!r.done,
      createdAt: r.createdAt || Date.now(),
      duration: 'permanent',
      expireDate: '',
      timeOfDay: '',
      customTime: '',
      reminderTime: dateTime || ''
    })
  })

  storageSet('todo_data', todos)
  storageSet('reminders_migrated', true)
  _todoAll = todos
}

function renderMemoPanel() {
  const tabs = [
    { key: 'memory', label: '记忆' },
    { key: 'calendar', label: '日历' },
    { key: 'todo', label: '待办' }
  ]

  const tabsHtml = tabs.map(t => {
    const isActive = state.memoActiveTab === t.key
    const badgeMap = { memory: 'memory', todo: 'todo', calendar: 'event' }
    const badge = state.memoBadgeCounts[badgeMap[t.key]]
    const badgeHtml = badge > 0 ? `<span class="memo__badge">${badge}</span>` : ''
    return `<button class="memo__tab ${isActive ? 'memo__tab--active' : ''}" onclick="onMemoTabChange('${t.key}')">
      <span>${t.label}</span>${badgeHtml}
    </button>`
  }).join('')

  let bodyContent = ''
  if (state.memoActiveTab === 'memory') {
    bodyContent = renderMemoMemory()
  } else if (state.memoActiveTab === 'calendar') {
    bodyContent = renderMemoCalendar()
  } else {
    bodyContent = renderMemoTodo()
  }

  return `<div class="memo">
    <div class="memo__tabs">${tabsHtml}</div>
    <div class="memo__body">${bodyContent}</div>
  </div>`
}

function renderMemoMemory() {
  const items = state.memoryItems.map(m => {
    const cat = m.category || 'personal'
    const catLabel = { preference: '偏好', habit: '习惯', event: '事件', personal: '个人' }[cat] || '个人'
    return `<div class="memo__item">
      <div class="memo__item-head">
        <span class="memo__item-cat memo__item-cat--${cat}">${catLabel}</span>
        <span class="memo__item-time">${m.timeText}</span>
      </div>
      <span class="memo__item-text">${escHtml(m.content)}</span>
      <button class="memo__item-del" onclick="onDeleteMemoryItem('${m.id}')">删除</button>
    </div>`
  }).join('')
  return `<div class="memo__items">${items || '<div class="memo__empty">AI还在学习中，暂无提取的记忆</div>'}</div>`
}

function renderMemoTodo() {
  const pendingTodos = _todoAll.filter(t => !t.done)
  const canAdd = pendingTodos.length < 4

  const items = state.todoList.map(t => {
    const badge = t.duration === 'custom' ? `<span class="todo-badge">截止 ${t.expireDate}</span>` :
                  t.duration === 'permanent' ? `<span class="todo-badge todo-badge--perm">永久</span>` :
                  t.timeOfDay ? `<span class="todo-badge">${t.timeOfDay}</span>` : ''
    const reminderBadge = t.reminderTime ? `<span class="todo-badge todo-badge--reminder">🔔 ${t.reminderTime.slice(11, 16)}</span>` : ''
    return `<div class="todo-row">
      <div class="todo-edit" onclick="onTodoEdit('${t.id}')">✎</div>
      <div class="todo-text-wrap">
        <span class="todo-text ${t.done ? 'todo-text--done' : ''}">${escHtml(t.content)}</span>
        <span>${badge}${reminderBadge}</span>
      </div>
      <div class="todo-del" onclick="onTodoDelete('${t.id}')">删除</div>
      <div class="todo-check ${t.done ? 'todo-check--done' : ''}" onclick="onTodoToggle('${t.id}')"></div>
    </div>`
  }).join('')

  const today = getTodayYMD()
  const now = new Date()
  const defaultTime = `${pad2(now.getHours() + 1)}:00`

  return `<div class="todo-panel">
    <div class="todo-actions">
      <span class="todo-date">${state.todoSelectedDate}</span>
      <span class="todo-count">${pendingTodos.length}/4</span>
    </div>
    <div class="todo-add-form">
      <input class="todo-input" id="todoInput" placeholder="输入待办内容..." maxlength="50" />
      <div class="todo-add-row">
        <select class="todo-time" id="todoTimeOfDay" onchange="onTodoTimeChange(this)">
          <option value="">时段</option>
          <option value="早上">早上</option>
          <option value="上午">上午</option>
          <option value="中午">中午</option>
          <option value="下午">下午</option>
          <option value="晚上">晚上</option>
          <option value="自定义">自定义时间</option>
        </select>
        <input type="time" class="todo-time-input" id="todoCustomTime" value="${defaultTime}" style="display:none;" />
        <select class="todo-expire" id="todoExpire" onchange="onTodoExpireChange(this)">
          <option value="permanent">永久</option>
          <option value="3days">3天</option>
          <option value="7days">7天</option>
          <option value="custom">自定义日期</option>
        </select>
        <input type="date" class="todo-expire-date" id="todoExpireDate" style="display:none;" />
      </div>
      <div class="todo-add-row todo-reminder-row">
        <span class="todo-reminder-label">🔔 提醒</span>
        <select class="todo-time" id="todoReminderSelect" onchange="onTodoReminderChange(this)">
          <option value="">不提醒</option>
          <option value="same">准时提醒</option>
          <option value="5min">提前5分钟</option>
          <option value="15min">提前15分钟</option>
          <option value="30min">提前30分钟</option>
          <option value="1hour">提前1小时</option>
          <option value="custom">自定义时间</option>
        </select>
        <input type="time" class="todo-time-input" id="todoReminderTime" value="${defaultTime}" style="display:none;" />
      </div>
      <button class="todo-add-btn ${!canAdd ? 'todo-add-btn--disabled' : ''}" onclick="onTodoSubmit()">添加</button>
    </div>
    <div class="todo-list2">
      ${items || '<div class="todo-empty">这一天还没有待办</div>'}
    </div>
  </div>`
}

function renderMemoCalendar() {
  const weekLabels = ['日', '一', '二', '三', '四', '五', '六']
  const cells = state.todoCalendarCells.map((c, i) => {
    if (!c.inMonth) {
      return `<div class="calendar__cell calendar__cell--dim">
        <span class="calendar__day">${c.label}</span>
      </div>`
    }
    const mood = _moodList.find(m => m.date === c.date)
    const dayTodos = _todoAll.filter(t => t.date === c.date)
    const dayEvents = _calendarEvents.filter(e => e.date === c.date)
    const hasTodo = dayTodos.length > 0
    const hasEvent = dayEvents.length > 0
    const cls = [c.selected ? 'calendar__cell--selected' : '', c.today ? 'calendar__cell--today' : ''].filter(Boolean).join(' ')

    let indicator = ''
    if (mood) {
      indicator = `<span class="calendar__mood">${mood.emoji}</span>`
    } else if (hasTodo || hasEvent) {
      indicator = `<div class="calendar__dots">
        ${hasTodo ? '<div class="calendar__dot calendar__dot--todo"></div>' : ''}
        ${hasEvent ? '<div class="calendar__dot calendar__dot--event"></div>' : ''}
      </div>`
    }

    return `<div class="calendar__cell ${cls}" onclick="onMemoCalendarSelectDate('${c.date}')">
      <span class="calendar__day">${c.label}</span>
      ${indicator}
    </div>`
  }).join('')

  const selDate = state.todoSelectedDate
  const selMood = _moodList.find(m => m.date === selDate)
  const selTodos = filterTodoByDate(_todoAll, selDate)
  const selEvents = _calendarEvents.filter(e => e.date === selDate)
  const selTodosDone = selTodos.filter(t => t.done).length

  const parts = []
  if (selMood) parts.push(`${selMood.emoji} ${selMood.label}`)
  if (selTodos.length > 0) parts.push(`${selTodosDone}/${selTodos.length} 待办`)
  if (selEvents.length > 0) parts.push(`${selEvents.length} 事件`)

  const summary = parts.length > 0 ? parts.join(' · ') : '这一天还没有记录'

  return `<div class="memo-calendar">
    <div class="calendar-wrap">
      <div class="calendar__bar">
        <button class="calendar__btn" onclick="onMemoCalendarPrevMonth()">‹</button>
        <span class="calendar__title">${state.todoMonthTitle}</span>
        <button class="calendar__btn" onclick="onMemoCalendarNextMonth()">›</button>
      </div>
      <div class="calendar">
        <div class="calendar__week">${weekLabels.map(w => `<span class="calendar__wk">${w}</span>`).join('')}</div>
        <div class="calendar__grid">${cells}</div>
      </div>
      <div class="cal-legend">
        <div class="cal-legend__item"><div class="calendar__dot calendar__dot--todo"></div><span>待办</span></div>
        <div class="cal-legend__item"><div class="calendar__dot calendar__dot--event"></div><span>事件</span></div>
        <div class="cal-legend__item"><span class="cal-legend__emoji">😊</span><span>心情</span></div>
      </div>
    </div>
    <div class="cal-summary">
      <span class="cal-summary__date">${selDate}</span>
      <span class="cal-summary__text">${summary}</span>
    </div>
  </div>`
}

function renderMemoReminders() {
  const items = state.reminderList.map(r => {
    const label = r.done ? '已完成' : (r.isPast ? '已过期' : '待提醒')
    const linkedTodo = r.todoId ? _todoAll.find(t => t.id === r.todoId) : null
    return `<div class="memo__item ${r.done ? 'memo__item--done' : ''}">
      <div class="memo__item-head">
        <span class="memo__item-cat memo__item-cat--${r.done ? 'past' : 'reminder'}">${label}</span>
        <span class="memo__item-date">${r.displayTime || r.dateTime}</span>
      </div>
      <div class="memo__item-row">
        <div class="memo__item-check ${r.done ? 'memo__item-check--on' : ''}" onclick="onReminderToggle('${r.id}')"></div>
        <div class="memo__item-text memo__item-text--flex">
          <span>${escHtml(r.content)}</span>
          ${linkedTodo ? `<span class="reminder-link">联动待办：${escHtml(linkedTodo.content)}</span>` : ''}
        </div>
      </div>
      <button class="memo__item-del" onclick="onDeleteReminder('${r.id}')">删除</button>
    </div>`
  }).join('')

  const pendingTodos = _todoAll.filter(t => !t.done)
  const todoOptions = pendingTodos.map(t => `<option value="${t.id}">${escHtml(t.content)}</option>`).join('')

  const now = new Date()
  const defaultDate = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
  const defaultTime = `${pad2(now.getHours())}:${pad2(now.getMinutes() + 10)}`

  return `<div class="reminder-panel">
    <div class="reminder-add">
      <div class="reminder-add__title">添加提醒</div>
      <div class="field">
        <span class="label">提醒内容</span>
        <input class="input" id="reminderContent" placeholder="输入提醒内容..." />
      </div>
      <div class="field">
        <span class="label">联动待办（可选）</span>
        <select class="picker" id="reminderTodoSelect">
          <option value="">不联动</option>
          ${todoOptions}
        </select>
      </div>
      <div class="field field--row">
        <div class="field field--col field--flex">
          <span class="label">日期</span>
          <input type="date" class="picker" id="reminderDate" value="${defaultDate}" />
        </div>
        <div class="field field--col field--flex">
          <span class="label">时间</span>
          <input type="time" class="picker" id="reminderTime" value="${defaultTime}" />
        </div>
      </div>
      <button class="save" onclick="onAddReminder()">添加提醒</button>
    </div>
    <div class="reminder-list-title">所有提醒</div>
    <div class="memo__items">
      ${items || '<div class="memo__empty">暂无提醒事项</div>'}
    </div>
  </div>`
}

function renderMemoPersona() {
  const dayGroups = state.personaDayGroups.map(day => {
    const msgs = day.list.map(m => `
      <div class="day-group__msg" onclick="onPersonaLoadDay('${day.date}')">
        <div class="day-group__msg-meta">
          <span class="day-group__msg-role ${m.role === 'assistant' ? 'day-group__msg-role--ai' : ''}">${m.role === 'user' ? '你' : '百合精灵'}</span>
          <span class="day-group__msg-time">${m.timeText}</span>
        </div>
        <span class="day-group__msg-text">${escHtml(m.content)}</span>
      </div>
    `).join('')

    return `<div class="day-group">
      <div class="day-group__head" onclick="onPersonaToggleDay('${day.date}')">
        <div class="day-group__head-left">
          <span class="day-group__arrow ${day.expanded ? 'day-group__arrow--open' : ''}">▶</span>
          <span class="day-group__date">${day.date}</span>
          <span class="day-group__count">${day.list.length}条</span>
        </div>
        <div class="day-group__head-right">
          <button class="day-group__extract" onclick="event.stopPropagation();onPersonaExtractDay('${day.date}')">提取</button>
          <button class="day-group__del" onclick="event.stopPropagation();onPersonaDeleteDay('${day.date}')">删除</button>
        </div>
      </div>
      ${day.expanded ? `<div class="day-group__body">${msgs}</div>` : ''}
    </div>`
  }).join('')

  return `<div class="memo__body memo__body--scroll">
    <div class="form">
      <div class="field">
        <span class="label">姓名</span>
        <input class="input" value="${escAttr(state.profile.name || '')}" data-key="name" oninput="onProfileInput(this, 'name')" placeholder="你的名字" />
      </div>
      <div class="field">
        <span class="label">生日</span>
        <input type="date" class="picker" value="${state.profile.birthday || ''}" data-key="birthday" onchange="onProfileBirthdayChange(this)" />
      </div>
      <div class="field field--col">
        <span class="label">性格</span>
        <textarea class="textarea" data-key="personality" oninput="onProfileInput(this, 'personality')" placeholder="比如：喜欢简洁、需要鼓励…">${escHtml(state.profile.personality || '')}</textarea>
      </div>
      <button class="save" onclick="onSaveProfile">保存档案</button>
    </div>

    <div class="form">
      <div class="field field--col">
        <span class="label">AI记忆</span>
        <textarea class="textarea textarea--memory" id="aiConfigPersona" oninput="onAiConfigInput(this)" placeholder="从聊天记录中提取关键信息，将自动沉淀为AI记忆…">${escHtml(state.aiConfig.persona || '')}</textarea>
      </div>
      <button class="save" onclick="onSaveAiConfig">保存记忆</button>
    </div>

    <div class="history">
      <div class="history__title">历史对话</div>
      <div class="history__list">
        ${dayGroups || '<div class="history__empty">暂无历史</div>'}
      </div>
    </div>
  </div>`
}

function onTodoPrevMonth() {
  let y = state.todoYear, m = state.todoMonth - 1
  if (m <= 0) { y -= 1; m = 12 }
  state.todoYear = y
  state.todoMonth = m
  state.todoMonthTitle = `${y}年${m}月`
  state.todoCalendarCells = buildMonthCells(y, m, state.todoSelectedDate)
  renderPanelBody()
}

function onTodoNextMonth() {
  let y = state.todoYear, m = state.todoMonth + 1
  if (m >= 13) { y += 1; m = 1 }
  state.todoYear = y
  state.todoMonth = m
  state.todoMonthTitle = `${y}年${m}月`
  state.todoCalendarCells = buildMonthCells(y, m, state.todoSelectedDate)
  renderPanelBody()
}

function onTodoToggleCalendar() {
  state.todoCalendarVisible = !state.todoCalendarVisible
  renderPanelBody()
}

function onTodoSelectDate(date) {
  if (!date) return
  state.todoSelectedDate = date
  state.todoCalendarCells = buildMonthCells(state.todoYear, state.todoMonth, date)
  _todoAll = storageGet('todo_data', [])
  state.todoList = filterTodoByDate(_todoAll, date)
  renderPanelBody()
}

function onTodoTimeChange(el) {
  const customTime = $('todoCustomTime')
  if (customTime) {
    customTime.style.display = el.value === '自定义' ? 'inline-block' : 'none'
  }
}

function onTodoExpireChange(el) {
  const expireDate = $('todoExpireDate')
  if (expireDate) {
    expireDate.style.display = el.value === 'custom' ? 'inline-block' : 'none'
  }
}

function onTodoReminderChange(el) {
  const reminderTime = $('todoReminderTime')
  if (reminderTime) {
    reminderTime.style.display = el.value === 'custom' ? 'inline-block' : 'none'
  }
}

function onTodoSubmit() {
  const input = $('todoInput')
  const timeSelect = $('todoTimeOfDay')
  const customTime = $('todoCustomTime')
  const expireSelect = $('todoExpire')
  const expireDate = $('todoExpireDate')
  const reminderSelect = $('todoReminderSelect')
  const reminderTimeInput = $('todoReminderTime')

  const content = input ? input.value.trim() : ''
  if (!content) {
    showToast('请输入待办内容')
    return
  }

  const pendingTodos = _todoAll.filter(t => !t.done && t.date === state.todoSelectedDate)
  if (pendingTodos.length >= 4) {
    showToast('每天最多4个待办')
    return
  }

  const timeOfDay = timeSelect ? timeSelect.value : ''
  const customTimeVal = customTime ? customTime.value : ''

  let duration = 'permanent'
  let expireDateVal = ''

  if (expireSelect) {
    const expire = expireSelect.value
    if (expire === '3days') {
      duration = 'custom'
      const d = new Date()
      d.setDate(d.getDate() + 3)
      expireDateVal = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
    } else if (expire === '7days') {
      duration = 'custom'
      const d = new Date()
      d.setDate(d.getDate() + 7)
      expireDateVal = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
    } else if (expire === 'custom') {
      duration = 'custom'
      expireDateVal = expireDate ? expireDate.value : ''
    } else {
      duration = 'permanent'
    }
  }

  let reminderTime = ''
  const reminderOpt = reminderSelect ? reminderSelect.value : ''
  if (reminderOpt) {
    const todoDate = state.todoSelectedDate || getTodayYMD()
    let baseHour = 9
    let baseMin = 0

    if (customTimeVal && timeOfDay === '自定义') {
      const parts = customTimeVal.split(':')
      baseHour = parseInt(parts[0]) || 9
      baseMin = parseInt(parts[1]) || 0
    } else if (timeOfDay === '早上') {
      baseHour = 8; baseMin = 0
    } else if (timeOfDay === '上午') {
      baseHour = 10; baseMin = 0
    } else if (timeOfDay === '中午') {
      baseHour = 12; baseMin = 0
    } else if (timeOfDay === '下午') {
      baseHour = 15; baseMin = 0
    } else if (timeOfDay === '晚上') {
      baseHour = 20; baseMin = 0
    }

    if (reminderOpt === 'custom' && reminderTimeInput && reminderTimeInput.value) {
      const parts = reminderTimeInput.value.split(':')
      reminderTime = `${todoDate} ${pad2(parseInt(parts[0]) || 0)}:${pad2(parseInt(parts[1]) || 0)}`
    } else {
      const baseTime = new Date(`${todoDate}T${pad2(baseHour)}:${pad2(baseMin)}:00`)
      let offsetMs = 0
      if (reminderOpt === '5min') offsetMs = -5 * 60 * 1000
      else if (reminderOpt === '15min') offsetMs = -15 * 60 * 1000
      else if (reminderOpt === '30min') offsetMs = -30 * 60 * 1000
      else if (reminderOpt === '1hour') offsetMs = -60 * 60 * 1000
      const rt = new Date(baseTime.getTime() + offsetMs)
      reminderTime = `${rt.getFullYear()}-${pad2(rt.getMonth() + 1)}-${pad2(rt.getDate())} ${pad2(rt.getHours())}:${pad2(rt.getMinutes())}`
    }
  }

  const item = {
    id: `t_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    date: state.todoSelectedDate || getTodayYMD(),
    content,
    done: false,
    createdAt: Date.now(),
    duration,
    expireDate: expireDateVal,
    timeOfDay,
    customTime: customTimeVal,
    reminderTime
  }

  _todoAll = storageGet('todo_data', [])
  _todoAll.push(item)
  storageSet('todo_data', _todoAll)
  state.todoList = filterTodoByDate(_todoAll, state.todoSelectedDate)
  state.memoBadgeCounts = buildMemoBadgeCounts()
  renderPanelBody()
  showToast('待办已添加')

  if (input) input.value = ''
  if (timeSelect) timeSelect.value = ''
  if (expireSelect) expireSelect.value = 'permanent'
}

function onTodoToggle(id) {
  _todoAll = storageGet('todo_data', [])
  _todoAll = _todoAll.map(t => t.id === id ? { ...t, done: !t.done } : t)
  storageSet('todo_data', _todoAll)
  state.todoList = filterTodoByDate(_todoAll, state.todoSelectedDate)
  state.memoBadgeCounts = buildMemoBadgeCounts()
  renderPanelBody()

  const isNowDone = _todoAll.find(t => t.id === id)?.done
  if (isNowDone) {
    const allNowDone = state.todoList.every(t => t.done)
    if (allNowDone && state.todoList.length > 0) showAllDonePraise()
  }
}

async function onTodoEdit(id) {
  const item = _todoAll.find(t => t.id === id)
  if (!item) return

  _editingTodoId = id

  const contentEl = $('editTodoContent')
  const timeSelect = $('editTodoTimeOfDay')
  const customTime = $('editTodoCustomTime')
  const expireSelect = $('editTodoExpire')
  const expireDate = $('editTodoExpireDate')
  const reminderSelect = $('editTodoReminder')
  const reminderTime = $('editTodoReminderTime')

  if (contentEl) contentEl.value = item.content
  if (timeSelect) timeSelect.value = item.timeOfDay || ''
  if (customTime) {
    customTime.value = item.customTime || '09:00'
    customTime.style.display = item.timeOfDay === '自定义' ? 'inline-block' : 'none'
  }

  if (expireSelect) {
    if (item.duration === 'custom' && item.expireDate) {
      expireSelect.value = 'custom'
    } else {
      expireSelect.value = item.duration || 'permanent'
    }
  }
  if (expireDate) {
    expireDate.value = item.expireDate || ''
    expireDate.style.display = (item.duration === 'custom' && item.expireDate) ? 'inline-block' : 'none'
  }

  if (reminderSelect) {
    reminderSelect.value = item.reminderTime ? 'same' : ''
  }
  if (reminderTime) {
    if (item.reminderTime && item.reminderTime.length >= 16) {
      reminderTime.value = item.reminderTime.slice(11, 16)
    } else {
      reminderTime.value = '09:00'
    }
    reminderTime.style.display = 'none'
  }

  const mask = $('todoEditMask')
  if (mask) {
    mask.style.display = 'flex'
    mask.style.opacity = '0'
    setTimeout(() => { mask.style.opacity = '1' }, 10)
  }
}

function onEditTodoTimeChange(el) {
  const customTime = $('editTodoCustomTime')
  if (customTime) {
    customTime.style.display = el.value === '自定义' ? 'inline-block' : 'none'
  }
}

function onEditTodoExpireChange(el) {
  const expireDate = $('editTodoExpireDate')
  if (expireDate) {
    expireDate.style.display = el.value === 'custom' ? 'inline-block' : 'none'
  }
}

function onEditTodoReminderChange(el) {
  const reminderTime = $('editTodoReminderTime')
  if (reminderTime) {
    reminderTime.style.display = el.value === 'custom' ? 'inline-block' : 'none'
  }
}

function onTodoEditCancel() {
  const mask = $('todoEditMask')
  if (!mask) return
  mask.style.opacity = '0'
  setTimeout(() => {
    mask.style.display = 'none'
    _editingTodoId = null
  }, 250)
}

function onTodoEditSave() {
  const id = _editingTodoId
  if (!id) {
    onTodoEditCancel()
    return
  }

  const contentEl = $('editTodoContent')
  const timeSelect = $('editTodoTimeOfDay')
  const customTime = $('editTodoCustomTime')
  const expireSelect = $('editTodoExpire')
  const expireDate = $('editTodoExpireDate')
  const reminderSelect = $('editTodoReminder')
  const reminderTimeInput = $('editTodoReminderTime')

  const content = contentEl ? contentEl.value.trim() : ''
  if (!content) {
    showToast('请输入待办内容')
    return
  }

  const timeOfDay = timeSelect ? timeSelect.value : ''
  const customTimeVal = customTime ? customTime.value : ''

  let duration = 'permanent'
  let expireDateVal = ''
  if (expireSelect) {
    const expire = expireSelect.value
    if (expire === '3days') {
      duration = 'custom'
      const d = new Date()
      d.setDate(d.getDate() + 3)
      expireDateVal = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
    } else if (expire === '7days') {
      duration = 'custom'
      const d = new Date()
      d.setDate(d.getDate() + 7)
      expireDateVal = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
    } else if (expire === 'custom') {
      duration = 'custom'
      expireDateVal = expireDate ? expireDate.value : ''
    } else {
      duration = 'permanent'
    }
  }

  let reminderTime = ''
  const reminderOpt = reminderSelect ? reminderSelect.value : ''
  if (reminderOpt) {
    const item = _todoAll.find(t => t.id === id)
    const todoDate = item ? item.date : getTodayYMD()
    let baseHour = 9
    let baseMin = 0

    if (customTimeVal && timeOfDay === '自定义') {
      const parts = customTimeVal.split(':')
      baseHour = parseInt(parts[0]) || 9
      baseMin = parseInt(parts[1]) || 0
    } else if (timeOfDay === '早上') {
      baseHour = 8; baseMin = 0
    } else if (timeOfDay === '上午') {
      baseHour = 10; baseMin = 0
    } else if (timeOfDay === '中午') {
      baseHour = 12; baseMin = 0
    } else if (timeOfDay === '下午') {
      baseHour = 15; baseMin = 0
    } else if (timeOfDay === '晚上') {
      baseHour = 20; baseMin = 0
    }

    if (reminderOpt === 'custom' && reminderTimeInput && reminderTimeInput.value) {
      const parts = reminderTimeInput.value.split(':')
      reminderTime = `${todoDate} ${pad2(parseInt(parts[0]) || 0)}:${pad2(parseInt(parts[1]) || 0)}`
    } else {
      const baseTime = new Date(`${todoDate}T${pad2(baseHour)}:${pad2(baseMin)}:00`)
      let offsetMs = 0
      if (reminderOpt === '5min') offsetMs = -5 * 60 * 1000
      else if (reminderOpt === '15min') offsetMs = -15 * 60 * 1000
      else if (reminderOpt === '30min') offsetMs = -30 * 60 * 1000
      else if (reminderOpt === '1hour') offsetMs = -60 * 60 * 1000
      const rt = new Date(baseTime.getTime() + offsetMs)
      reminderTime = `${rt.getFullYear()}-${pad2(rt.getMonth() + 1)}-${pad2(rt.getDate())} ${pad2(rt.getHours())}:${pad2(rt.getMinutes())}`
    }
  }

  _todoAll = storageGet('todo_data', [])
  _todoAll = _todoAll.map(t => t.id === id ? {
    ...t,
    content,
    timeOfDay,
    customTime: customTimeVal,
    duration,
    expireDate: expireDateVal,
    reminderTime
  } : t)
  storageSet('todo_data', _todoAll)

  state.todoList = filterTodoByDate(_todoAll, state.todoSelectedDate)
  state.memoBadgeCounts = buildMemoBadgeCounts()
  renderPanelBody()

  onTodoEditCancel()
  showToast('已保存修改')
}

function onTodoDelete(id) {
  _todoAll = storageGet('todo_data', [])
  _todoAll = _todoAll.filter(t => t.id !== id)
  storageSet('todo_data', _todoAll)
  state.todoList = filterTodoByDate(_todoAll, state.todoSelectedDate)
  state.memoBadgeCounts = buildMemoBadgeCounts()
  renderPanelBody()
}

function onMemoTodoPrevMonth() {
  let y = state.todoYear, m = state.todoMonth - 1
  if (m <= 0) { y -= 1; m = 12 }
  state.todoYear = y
  state.todoMonth = m
  state.todoMonthTitle = `${y}年${m}月`
  state.todoCalendarCells = buildMonthCells(y, m, state.todoSelectedDate)
  renderPanelBody()
}

function onMemoTodoNextMonth() {
  let y = state.todoYear, m = state.todoMonth + 1
  if (m >= 13) { y += 1; m = 1 }
  state.todoYear = y
  state.todoMonth = m
  state.todoMonthTitle = `${y}年${m}月`
  state.todoCalendarCells = buildMonthCells(y, m, state.todoSelectedDate)
  renderPanelBody()
}

function onMemoTodoToggleCalendar() {
  state.todoCalendarVisible = !state.todoCalendarVisible
  renderPanelBody()
}

function onMemoTodoSelectDate(date) {
  if (!date) return
  state.todoSelectedDate = date
  state.todoCalendarCells = buildMonthCells(state.todoYear, state.todoMonth, date)
  _todoAll = storageGet('todo_data', [])
  state.todoList = filterTodoByDate(_todoAll, date)
  renderPanelBody()
}

function onMemoCalendarPrevMonth() {
  let y = state.todoYear, m = state.todoMonth - 1
  if (m <= 0) { y -= 1; m = 12 }
  state.todoYear = y
  state.todoMonth = m
  state.todoMonthTitle = `${y}年${m}月`
  state.todoCalendarCells = buildMonthCells(y, m, state.todoSelectedDate)
  renderPanelBody()
}

function onMemoCalendarNextMonth() {
  let y = state.todoYear, m = state.todoMonth + 1
  if (m >= 13) { y += 1; m = 1 }
  state.todoYear = y
  state.todoMonth = m
  state.todoMonthTitle = `${y}年${m}月`
  state.todoCalendarCells = buildMonthCells(y, m, state.todoSelectedDate)
  renderPanelBody()
}

function onMemoCalendarSelectDate(date) {
  if (!date) return
  state.todoSelectedDate = date
  state.todoCalendarCells = buildMonthCells(state.todoYear, state.todoMonth, date)
  renderPanelBody()
}

function showAllDonePraise() {
  const praises = [
    '太棒啦！今天的每一件事你都很用心地完成了，我真为你感到骄傲～',
    '哇，全部完成！你真是闪闪发光的小太阳，继续加油哦！',
    '好厉害！今天的待办全部清空啦，你值得一片花海和暖阳～',
    '完美的执行力！每一个勾选都是你努力的小脚印，继续向前吧～',
    '全部完成啦！你就像春天的百合一样充满能量，为你开心！'
  ]
  state.todoPraiseText = praises[Math.floor(Math.random() * praises.length)]
  state.todoPraiseVisible = true
  showPraiseDialog()
}

function showPraiseDialog() {
  const mask = $('praiseMask')
  const text = $('praiseText')
  if (!mask || !text) return
  text.textContent = state.todoPraiseText
  mask.style.display = 'flex'
  mask.style.opacity = '0'
  setTimeout(() => { mask.style.opacity = '1' }, 10)
}

function closePraiseDialog() {
  const mask = $('praiseMask')
  if (!mask) return
  mask.style.opacity = '0'
  setTimeout(() => { mask.style.display = 'none' }, 250)
  state.todoPraiseVisible = false
}

function onMemoTabChange(tab) {
  state.memoActiveTab = tab
  renderPanelBody()
}

function onDeleteMemoryItem(id) {
  let items = storageGet('memory_items', [])
  items = items.filter(m => m.id !== id)
  storageSet('memory_items', items)
  _memoryItems = items
  state.memoryItems = decorateMemoryItems(items)
  state.memoBadgeCounts = buildMemoBadgeCounts()
  renderMemoBadges()
  renderPanelBody()
}

function onDeleteCalendarEvent(id) {
  let events = storageGet('calendar_events', [])
  events = events.filter(ev => ev.id !== id)
  storageSet('calendar_events', events)
  _calendarEvents = events
  state.calendarEvents = decorateCalendarEvents(events)
  state.memoBadgeCounts = buildMemoBadgeCounts()
  renderMemoBadges()
  renderPanelBody()
}

function onAddReminder() {
  const contentEl = $('reminderContent')
  const todoSelectEl = $('reminderTodoSelect')
  const dateEl = $('reminderDate')
  const timeEl = $('reminderTime')

  const content = contentEl ? contentEl.value.trim() : ''
  const todoId = todoSelectEl ? todoSelectEl.value : ''
  const date = dateEl ? dateEl.value : ''
  const time = timeEl ? timeEl.value : ''

  if (!content) {
    showToast('请输入提醒内容')
    return
  }
  if (!date || !time) {
    showToast('请选择提醒时间')
    return
  }

  const dateTime = `${date} ${time}`
  const reminder = {
    id: `r_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    content,
    todoId: todoId || '',
    date,
    time,
    dateTime,
    done: false,
    createdAt: Date.now()
  }

  let reminders = storageGet('reminders', [])
  reminders.push(reminder)
  storageSet('reminders', reminders)
  _reminders = reminders
  state.reminderList = decorateReminders(reminders)
  state.memoBadgeCounts = buildMemoBadgeCounts()
  renderPanelBody()
  showToast('提醒已添加～')

  if (contentEl) contentEl.value = ''
  if (todoSelectEl) todoSelectEl.value = ''
}

function onDeleteReminder(id) {
  let reminders = storageGet('reminders', [])
  reminders = reminders.filter(r => r.id !== id)
  storageSet('reminders', reminders)
  _reminders = reminders
  state.reminderList = decorateReminders(reminders)
  state.memoBadgeCounts = buildMemoBadgeCounts()
  renderMemoBadges()
  renderPanelBody()
}

function onReminderToggle(id) {
  let reminders = storageGet('reminders', [])
  reminders = reminders.map(r => r.id === id ? { ...r, done: !r.done } : r)
  storageSet('reminders', reminders)
  _reminders = reminders
  state.reminderList = decorateReminders(reminders)
  state.memoBadgeCounts = buildMemoBadgeCounts()
  renderMemoBadges()
  renderPanelBody()
}

function renderMemoBadges() {
}


// chat.js - 聊天相关模块

let API_KEY = ''
let BASE_URL = ''

function setConfig(config) {
  if (config && config.baseUrl) BASE_URL = config.baseUrl
  if (config && config.apiKey) API_KEY = config.apiKey
}

async function sendChat({ messages, timeout = 60000 }) {
  if (!API_KEY) {
    showToast('请先配置 API 密钥')
    throw new Error('NO_API_KEY')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages
      }),
      signal: controller.signal
    })
    clearTimeout(timer)

    if (res.status !== 200) {
      const data = await res.json().catch(() => ({}))
      showToast(`请求失败：${res.status}`)
      throw new Error(`HTTP_${res.status}`)
    }

    const data = await res.json()

    if (data.error) {
      showToast(`AI错误：${data.error.message || '未知错误'}`)
      throw new Error(data.error.message || 'BIZ_ERROR')
    }

    const content = data.choices?.[0]?.message?.content
    if (!content) {
      showToast('AI未返回有效内容')
      throw new Error('EMPTY_REPLY')
    }
    return content
  } catch (e) {
    clearTimeout(timer)
    if (e.name === 'AbortError') showToast('请求超时')
    throw e
  }
}

const CHAT_PAGE_SIZE = 50
let _chatRenderStart = 0
let _chatScrollTop = 0
let _chatScrollTimer = null

function renderChatList(full = false) {
  const container = $('chatList')
  if (!container) return

  const total = state.chatList.length
  let start = 0

  if (!full && total > CHAT_PAGE_SIZE * 2) {
    start = Math.max(0, total - CHAT_PAGE_SIZE)
  }

  _chatRenderStart = start
  const visible = state.chatList.slice(start)

  const spacerTop = start > 0 ? `<div class="chat-spacer" id="chatSpacerTop" style="height:${start * 80}px"></div>` : ''
  const loadMore = start > 0 ? '<div class="chat-loadmore" onclick="loadMoreChat()">↑ 加载更多消息</div>' : ''

  container.innerHTML = spacerTop + loadMore + visible.map((msg, i) => {
    const html = markdownToHtml(msg.content)
    const editBtn = msg.role === 'assistant'
      ? `<div class="msg-edit" onclick="onEditAiMessage('${msg.id}')">✎</div>`
      : ''
    return `<div class="chat-msg chat-msg--${msg.role}" id="msg-${msg.id}" data-idx="${start + i}">
      <div class="message-bubble">${html}</div>
      ${editBtn}
    </div>`
  }).join('')

  if (full || _chatScrollTop === 0) {
    requestAnimationFrame(() => {
      const scroll = $('chatScroll')
      if (scroll) scroll.scrollTop = scroll.scrollHeight
    })
  }
}

function loadMoreChat() {
  const total = state.chatList.length
  const newStart = Math.max(0, _chatRenderStart - CHAT_PAGE_SIZE)
  if (newStart >= _chatRenderStart) return

  const scroll = $('chatScroll')
  const prevHeight = scroll ? scroll.scrollHeight : 0

  _chatRenderStart = newStart
  const visible = state.chatList.slice(newStart)

  const spacerTop = newStart > 0 ? `<div class="chat-spacer" id="chatSpacerTop" style="height:${newStart * 80}px"></div>` : ''
  const loadMore = newStart > 0 ? '<div class="chat-loadmore" onclick="loadMoreChat()">↑ 加载更多消息</div>' : ''

  const container = $('chatList')
  if (!container) return

  container.innerHTML = spacerTop + loadMore + visible.map((msg, i) => {
    const html = markdownToHtml(msg.content)
    const editBtn = msg.role === 'assistant'
      ? `<div class="msg-edit" onclick="onEditAiMessage('${msg.id}')">✎</div>`
      : ''
    return `<div class="chat-msg chat-msg--${msg.role}" id="msg-${msg.id}" data-idx="${newStart + i}">
      <div class="message-bubble">${html}</div>
      ${editBtn}
    </div>`
  }).join('')

  if (scroll) {
    const newHeight = scroll.scrollHeight
    scroll.scrollTop = newHeight - prevHeight + scroll.scrollTop
  }
}

function appendChatMessage(msg) {
  const container = $('chatList')
  if (!container) return

  const total = state.chatList.length
  const idx = total - 1

  // 如果当前在底部附近，直接追加
  const scroll = $('chatScroll')
  const nearBottom = scroll ? (scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 100) : true

  // 如果消息数超过2页且在底部视图内，直接追加DOM
  if (total > CHAT_PAGE_SIZE * 2 && _chatRenderStart < total - CHAT_PAGE_SIZE && nearBottom) {
    const html = markdownToHtml(msg.content)
    const editBtn = msg.role === 'assistant'
      ? `<div class="msg-edit" onclick="onEditAiMessage('${msg.id}')">✎</div>`
      : ''
    const div = document.createElement('div')
    div.className = `chat-msg chat-msg--${msg.role}`
    div.id = `msg-${msg.id}`
    div.dataset.idx = idx
    div.innerHTML = `<div class="message-bubble">${html}</div>${editBtn}`
    container.appendChild(div)

    requestAnimationFrame(() => {
      if (scroll) scroll.scrollTop = scroll.scrollHeight
    })
    return
  }

  renderChatList(false)
}

function onInputChange(e) {
  state.inputText = e.target.value
}

function onInputKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

async function sendMessage() {
  const content = state.inputText.trim()
  if (!content) return
  if (state.sending) return

  state.sending = true
  safeSetData({ sending: true, inputText: '' })
  $('chatInput').value = ''

  pushLocalMessage('user', content)
  extractFromMessage(content)

  try {
    const apiMessages = buildApiMessages(_messages)
    if (!apiMessages) return

    const reply = await sendChat({ messages: apiMessages })
    pushLocalMessage('assistant', reply)
  } catch (e) {
  } finally {
    state.sending = false
    safeSetData({ sending: false })
  }
}

function pushLocalMessage(role, content) {
  _messages = _messages || []
  const id = `m_${Date.now()}_${Math.floor(Math.random() * 100000)}`
  const msg = { id, role, content }
  _messages.push(msg)

  state.chatList = state.chatList || []
  state.chatList.push({ id, role, content })

  safeSetData({ topEmoji: pickEmoji(content) })
  trimHistory()
  appendChatHistory(id, role, content)
  appendChatMessage(msg)
}

function trimHistory() {
  const MAX_CHARS = 10000
  let total = 0
  for (let i = _messages.length - 1; i >= 0; i--) {
    total += (_messages[i]?.content || '').length
    if (total > MAX_CHARS) {
      _messages = _messages.slice(i + 1)
      state.chatList = state.chatList.slice(i + 1)
      return
    }
  }
}

function appendChatHistory(id, role, content) {
  const entry = { id, role, content, createdAt: Date.now() }
  _chatHistory = storageGet('chat_history', [])
  _chatHistory.push(entry)
  _chatHistory = _chatHistory.slice(-200)
  storageSet('chat_history', _chatHistory)
}

function buildApiMessages(localMessages) {
  const base = Array.isArray(localMessages) ? localMessages : []
  const cleaned = base.map(m => ({ role: m.role, content: m.content })).filter(m => m.role && m.content !== undefined)

  const promptRules = (state.promptRules || '').trim()
  if (!promptRules) {
    showToast('请先在设置中填写并保存提示词规则')
    return null
  }

  const identity = (state.preset.identity || '').trim()
  const boundaries = (state.preset.boundaries || '').trim()
  if (!identity || !boundaries) {
    showToast('请先在设置中填写AI身份与能力边界')
    return null
  }

  const persona = buildSystemMessage()
  const sys = [
    { role: 'system', content: NO_HEADER_MD_RULE },
    { role: 'system', content: `在生成任何回复前，你必须严格校验并遵循以下用户要求与约束。AI基础身份：${identity}。能力边界：${boundaries}。用户提示词要求：${promptRules}。` }
  ]
  if (persona) sys.push({ role: 'system', content: persona })

  const MAX_CHARS = 10000
  let sysTotal = sys.reduce((s, s2) => s + (s2.content || '').length, 0)
  let avail = MAX_CHARS - sysTotal
  const trimmed = []
  for (let i = cleaned.length - 1; i >= 0; i--) {
    const c = (cleaned[i]?.content || '').length
    if (c > avail) break
    avail -= c
    trimmed.unshift(cleaned[i])
  }
  return sys.concat(trimmed)
}

function buildSystemMessage() {
  const name = (_userProfile?.name || '').trim() || '用户'
  const age = calcAge(_userProfile?.birthday || '')
  const personality = (_userProfile?.personality || '').trim()
  const memory = (_aiConfig?.persona || '').trim()

  const parts = [`你是一朵包容一切的百合花精灵，温柔、温暖，能接纳所有情绪。`, `你的对话对象是${name}${age ? `，他今年${age}岁` : ''}。`]
  if (personality) parts.push(`对方的性格与偏好：${personality}。`)
  if (memory) parts.push(`关于对方你记忆中的信息：\n${memory}`)
  parts.push('请使用自然、温暖、简洁的中文回应。')
  return parts.join('')
}

function fixReminderDateTime(dateTimeStr) {
  if (!dateTimeStr || typeof dateTimeStr !== 'string') return null
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')

  let str = dateTimeStr.trim()

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(str)) {
    const test = new Date(str.replace(' ', 'T'))
    if (!isNaN(test.getTime())) return str
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return `${str} 09:00`
  }

  if (/^\d{2}:\d{2}$/.test(str)) {
    return `${y}-${m}-${d} ${str}`
  }

  if (/^\d{1,2}:\d{2}$/.test(str)) {
    const parts = str.split(':')
    const hh = String(parseInt(parts[0])).padStart(2, '0')
    const mm = String(parseInt(parts[1])).padStart(2, '0')
    return `${y}-${m}-${d} ${hh}:${mm}`
  }

  const test = new Date(str)
  if (!isNaN(test.getTime())) {
    const ty = test.getFullYear()
    const tm = String(test.getMonth() + 1).padStart(2, '0')
    const td = String(test.getDate()).padStart(2, '0')
    const thh = String(test.getHours()).padStart(2, '0')
    const tmm = String(test.getMinutes()).padStart(2, '0')
    return `${ty}-${tm}-${td} ${thh}:${tmm}`
  }

  return null
}

function deduplicateItems(existing, newItems, keyField) {
  const existingSet = new Set(existing.map(item => item[keyField] || item.content))
  const added = []
  for (const item of newItems) {
    const key = item[keyField] || item.content
    if (!key) continue
    if (!existingSet.has(key) && !existing.some(e => e.content === item.content)) {
      added.push({
        id: `m_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
        ...item,
        createdAt: Date.now()
      })
    }
  }
  return added
}

function extractFromMessage(content) {
  if (!content || _extracting) return
  _extracting = true

  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const weekday = weekdays[now.getDay()]
  const todayStr = `${y}-${m}-${d} ${weekday} ${hh}:${mm}`

  const sysPrompt = INLINE_EXTRACT_PROMPT + `\n\n当前日期时间：${todayStr}\n请基于当前日期计算相对时间（如"今天"、"明天"、"后天"、"下周X"、"下午3点"等）。`

  const prompt = [
    { role: 'system', content: sysPrompt },
    { role: 'user', content }
  ]

  sendChat({ messages: prompt, timeout: 30000 })
    .then(reply => {
      _extracting = false
      const clean = reply.trim()
      if (!clean) return

      let parsed
      try {
        const jsonStart = clean.indexOf('{')
        const jsonEnd = clean.lastIndexOf('}')
        if (jsonStart === -1 || jsonEnd === -1) return
        parsed = JSON.parse(clean.slice(jsonStart, jsonEnd + 1))
      } catch (e) { return }

      const memories = Array.isArray(parsed.memories) ? parsed.memories : []
      const events = Array.isArray(parsed.events) ? parsed.events : []
      const reminders = Array.isArray(parsed.reminders) ? parsed.reminders : []

      let changed = false

      if (memories.length > 0) {
        const current = storageGet('memory_items', [])
        const added = deduplicateItems(current, memories, 'content')
        if (added.length > 0) {
          const next = current.concat(added)
          storageSet('memory_items', next)
          _memoryItems = next
          changed = true

          const personaText = memories.map(m => m.content).join('；')
          const currentPersona = _aiConfig?.persona?.trim() || ''
          const nextPersona = currentPersona ? `${currentPersona}\n${personaText}` : personaText
          _aiConfig = { persona: nextPersona }
          storageSet('ai_config', _aiConfig)
        }
      }

      if (events.length > 0) {
        const current = storageGet('calendar_events', [])
        const added = deduplicateItems(current, events, 'title')
        if (added.length > 0) {
          const next = current.concat(added)
          storageSet('calendar_events', next)
          _calendarEvents = next
          changed = true
        }
      }

      if (reminders.length > 0) {
        const fixedReminders = reminders
          .map(r => {
            const fixed = fixReminderDateTime(r.dateTime)
            return fixed ? { ...r, dateTime: fixed } : null
          })
          .filter(Boolean)
        const currentTodos = storageGet('todo_data', [])
        const existingContents = new Set(currentTodos.map(t => t.content))
        const newTodos = []
        fixedReminders.forEach(r => {
          if (!r.content || existingContents.has(r.content)) return
          const date = r.dateTime && r.dateTime.length >= 10 ? r.dateTime.slice(0, 10) : getTodayYMD()
          newTodos.push({
            id: `t_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
            date,
            content: r.content,
            done: false,
            createdAt: Date.now(),
            duration: 'permanent',
            expireDate: '',
            timeOfDay: '',
            customTime: '',
            reminderTime: r.dateTime || ''
          })
          existingContents.add(r.content)
        })
        if (newTodos.length > 0) {
          const next = currentTodos.concat(newTodos)
          storageSet('todo_data', next)
          _todoAll = next
          changed = true
        }
      }

      if (changed) {
        renderMemoBadges()
        if (state.panelKey === 'period' && state.memoActiveTab !== 'persona') {
          renderPanelBody()
        }
      }
    })
    .catch(() => { _extracting = false })
}


// app.js - 心语拾光 Web版
// 主入口文件，包含状态、面板控制、初始化等核心逻辑

// ============================================================
// 常量
// ============================================================
const NO_HEADER_MD_RULE =
  '你必须以 Markdown 格式回复，但严禁使用 # 或 ## 等任何级别的标题符号。请通过加粗 (bold) 或分段来实现层次感。'

const INLINE_EXTRACT_PROMPT = `分析以下这句话，看是否包含可采集的信息：

1. 日历事件：有明确日期或时间的安排（如"明天下午3点开会"）
2. 提醒事项：需要在未来某个时间提醒的事（如"记得周五交作业"）
3. 记忆：关于用户的性格、偏好或近况

严格按JSON格式输出，没有就返回空数组：
{"events":[{"title":"事件标题","date":"YYYY-MM-DD"}],"reminders":[{"content":"提醒内容","dateTime":"YYYY-MM-DD HH:mm"}],"memories":[{"content":"记忆内容","category":"preference|habit|event|personal"}]}
只输出JSON，不要多余的文字。`

const MOOD_MAP = {
  happy: { emoji: '😊', label: '开心' },
  warm: { emoji: '🌸', label: '温暖' },
  calm: { emoji: '🍃', label: '平静' },
  low: { emoji: '😔', label: '低落' },
  angry: { emoji: '😤', label: '生气' },
  tired: { emoji: '😴', label: '疲惫' }
}

const EXPORT_KEYS = [
  'user_registry', 'current_user',
  'chat_history', 'memory_items',
  'todo_data', 'calendar_events', 'reminders', 'mood_list',
  'user_profile', 'ai_config',
  'server_config', 'prompt_rules', 'preset_config',
  'notified_reminders', 'reminders_migrated',
  'plaza_posts'
]

// ============================================================
// 状态（替代 data 对象）
// ============================================================
const state = {
  panelKey: '',
  panelOpen: false,
  panelTitle: '',
  panelHint: '',
  panelSaveBtnVisible: false,
  presetSaveState: '',

  inputText: '',
  chatList: [],
  sending: false,

  todoYear: new Date().getFullYear(),
  todoMonth: new Date().getMonth() + 1,
  todoMonthTitle: '',
  todoSelectedDate: getTodayYMD(),
  todoCalendarCells: [],
  todoList: [],
  todoCalendarVisible: true,

  plazaPosts: [],

  memoActiveTab: 'memory',
  memoryItems: [],
  calendarEvents: [],
  reminderList: [],
  memoBadgeCounts: { memory: 0, todo: 0, event: 0, reminder: 0 },

  moodList: [],
  moodToday: '',

  profile: { name: '', birthday: '', personality: '' },
  aiConfig: { persona: '' },
  personaDayGroups: [],

  preset: { identity: '', boundaries: '' },
  serverConfig: { baseUrl: '', token: '' },
  promptRules: '',

  todoPraiseVisible: false,
  todoPraiseText: '',

  editVisible: false,
  editId: '',
  editText: ''
}

// 内部运行时数据（不渲染到 UI）
let _messages = []
let _chatHistory = []
let _todoAll = []
let _plazaPosts = []
let _userProfile = {}
let _aiConfig = {}
let _memoryItems = []
let _calendarEvents = []
let _reminders = []
let _moodList = []
let _notifiedReminders = []
let _reminderTimer = null
let _currentPopupReminderId = null
let _preset = {}
let _promptRules = ''
let _serverConfig = {}
let _extracting = false
let _pageReady = false
let _splashFadeTimer = null
let _splashRemoveTimer = null
let _panelTimer = null

// ============================================================
// 装饰器函数
// ============================================================
function decoratePlazaPosts(posts) {
  const list = Array.isArray(posts) ? posts : []
  return list.map(p => ({ ...p, timeText: formatTimeText(p.createdAt || 0) }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

function buildPersonaDayGroups() {
  const all = storageGet('chat_history', [])
  const arr = Array.isArray(all) ? all : []
  const groups = {}
  for (const h of arr) {
    if (!h || !h.createdAt) continue
    const d = new Date(h.createdAt)
    const dayKey = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
    if (!groups[dayKey]) groups[dayKey] = { date: dayKey, list: [] }
    groups[dayKey].list.push({
      id: h.id,
      role: h.role,
      content: h.content,
      timeText: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
      createdAt: h.createdAt
    })
  }
  let dayArr = Object.keys(groups).map(k => ({ date: k, expanded: false, list: groups[k].list }))
  dayArr.sort((a, b) => a.date > b.date ? -1 : 1)
  if (dayArr.length > 8) dayArr = dayArr.slice(0, 8)
  return dayArr
}

// ============================================================
// 面板管理
// ============================================================
function getPanelMeta(key) {
  if (key === 'memo') return { title: '备忘录' }
  if (key === 'plaza') return { title: '心语广场' }
  if (key === 'mood') return { title: '心情打卡' }
  if (key === 'settings') return { title: '设置' }
  return { title: '功能面板' }
}

function openPanel(key) {
  if (!key) return
  if (state.panelKey === key && state.panelOpen) { closePanel(); return }

  const meta = getPanelMeta(key)
  state.panelKey = key
  state.panelOpen = false
  state.panelTitle = meta.title
  state.panelSaveBtnVisible = key === 'settings'
  state.panelHint = meta.hint || ''

  const titleEl = $('panelTitle')
  if (titleEl) titleEl.textContent = meta.title
  const btn = $('panelSaveBtn')
  if (btn) btn.style.display = (key === 'settings') ? 'flex' : 'none'

  onPanelOpen(key)
  openPanelAnim()
}

function openPanelAnim() {
  const panel = $('panel')
  const mask = $('panelMask')
  if (!panel || !mask) return

  setTimeout(() => {
    panel.classList.add('panel--open')
    mask.classList.add('panel-mask--open')
    state.panelOpen = true
  }, 10)
}

function closePanel() {
  const panel = $('panel')
  const mask = $('panelMask')
  if (!panel || !mask) return

  panel.classList.remove('panel--open')
  mask.classList.remove('panel-mask--open')
  state.panelOpen = false

  clearTimeout(_panelTimer)
  _panelTimer = setTimeout(() => {
    state.panelKey = ''
    state.panelTitle = ''
    state.panelSaveBtnVisible = false
  }, 350)
}

function onPanelOpen(key) {
  if (key === 'memo') {
    cleanExpiredTodos()
    _todoAll = storageGet('todo_data', [])
    _userProfile = storageGet('user_profile', { name: '', birthday: '', personality: '' })
    _aiConfig = storageGet('ai_config', { persona: '' })
    _chatHistory = storageGet('chat_history', [])
    _memoryItems = storageGet('memory_items', [])
    _calendarEvents = storageGet('calendar_events', [])
    _reminders = storageGet('reminders', [])
    _moodList = storageGet('mood_list', [])

    state.todoList = filterTodoByDate(_todoAll, state.todoSelectedDate)
    state.todoCalendarCells = buildMonthCells(state.todoYear, state.todoMonth, state.todoSelectedDate)
    state.todoMonthTitle = `${state.todoYear}年${state.todoMonth}月`
    state.profile = _userProfile
    state.aiConfig = _aiConfig
    state.personaDayGroups = buildPersonaDayGroups()
    state.memoActiveTab = 'memory'
    state.memoryItems = decorateMemoryItems(_memoryItems)
    state.calendarEvents = decorateCalendarEvents(_calendarEvents)
    state.reminderList = decorateReminders(_reminders)
    state.memoBadgeCounts = buildMemoBadgeCounts()
  } else if (key === 'plaza') {
    _plazaPosts = storageGet('plaza_posts', [])
    state.plazaPosts = decoratePlazaPosts(_plazaPosts)
  } else if (key === 'mood') {
    _moodList = storageGet('mood_list', [])
    const today = getTodayYMD()
    const todayMood = _moodList.find(m => m.date === today)
    state.moodList = _moodList
    state.moodToday = todayMood ? todayMood.key : ''
  } else if (key === 'settings') {
    loadComponent4Config()
    state.presetSaveState = 'idle'
    _userProfile = storageGet('user_profile', { name: '', birthday: '', personality: '' })
    _aiConfig = storageGet('ai_config', { persona: '' })
    _chatHistory = storageGet('chat_history', [])
    state.profile = _userProfile
    state.aiConfig = _aiConfig
    state.personaDayGroups = buildPersonaDayGroups()
  }

  renderPanelBody()
}

function onSavePanelHeader() {
  if (state.panelKey === 'settings') {
    onSaveComponent4()
  }
}

// ============================================================
// 面板内容渲染
// ============================================================
function renderPanelBody() {
  const body = $('panelBody')
  if (!body) return

  const key = state.panelKey
  if (key === 'memo') body.innerHTML = renderMemoPanel()
  else if (key === 'plaza') body.innerHTML = renderPlazaPanel()
  else if (key === 'mood') body.innerHTML = renderMoodPanel()
  else if (key === 'settings') body.innerHTML = renderSettingsPanel()
  else body.innerHTML = '<div class="memo__empty">功能开发中…</div>'
}

// ---- 日历待办 ----
function renderTodoPanel() {
  const weekLabels = ['日', '一', '二', '三', '四', '五', '六']
  const cells = state.todoCalendarCells.map((c, i) => {
    const cls = [!c.inMonth ? 'calendar__cell--dim' : '', c.selected ? 'calendar__cell--selected' : '', c.today ? 'calendar__cell--today' : ''].filter(Boolean).join(' ')
    return `<div class="calendar__cell ${cls}" data-date="${c.date}" data-index="${i}" onclick="onTodoSelectDate('${c.date}')">
      <span class="calendar__day">${c.label}</span>
    </div>`
  }).join('')

  const items = state.todoList.map(t => {
    const badge = t.duration === 'custom' ? `<span class="todo-badge">截止 ${t.expireDate}</span>` :
                  t.duration === 'permanent' ? `<span class="todo-badge todo-badge--perm">永久</span>` : ''
    return `<div class="todo-row">
      <div class="todo-edit" onclick="onTodoEdit('${t.id}')">✎</div>
      <div class="todo-text-wrap">
        <span class="todo-text ${t.done ? 'todo-text--done' : ''}">${escHtml(t.content)}</span>
        ${badge}
      </div>
      <div class="todo-del" onclick="onTodoDelete('${t.id}')">删除</div>
      <div class="todo-check ${t.done ? 'todo-check--done' : ''}" onclick="onTodoToggle('${t.id}')"></div>
    </div>`
  }).join('')

  const calVisible = state.todoCalendarVisible ? 'block' : 'none'

  return `<div class="todo-panel">
    <div class="calendar-wrap">
      <div class="calendar__bar">
        <button class="calendar__btn" onclick="onTodoPrevMonth">‹</button>
        <span class="calendar__title">${state.todoMonthTitle}</span>
        <div class="calendar__bar-right">
          <button class="calendar__btn calendar__btn--sm" onclick="onTodoToggleCalendar">${state.todoCalendarVisible ? '▲' : '▼'}</button>
          <button class="calendar__btn" onclick="onTodoNextMonth">›</button>
        </div>
      </div>
      <div class="calendar" style="display:${calVisible}">
        <div class="calendar__week">${weekLabels.map(w => `<span class="calendar__wk">${w}</span>`).join('')}</div>
        <div class="calendar__grid">${cells}</div>
      </div>
    </div>
    <div class="todo-actions">
      <button class="todo-add ${state.todoList.length >= 4 ? 'todo-add--disabled' : ''}" onclick="onTodoAdd">添加待办</button>
      <span class="todo-date">${state.todoSelectedDate}</span>
    </div>
    <div class="todo-list2">
      ${items || '<div class="todo-empty">这一天还没有待办</div>'}
    </div>
  </div>`
}

// ---- 心语广场 ----
function renderPlazaPanel() {
  const posts = state.plazaPosts.map(p => `
    <div class="post">
      <div class="post__meta">${p.timeText}</div>
      <div class="post__content">${escHtml(p.content)}</div>
      ${p.reply ? `<div class="post__reply">${escHtml(p.reply)}</div>` : ''}
      <div class="post__actions">
        <button class="post__like ${p.liked ? 'post__like--on' : ''}" onclick="onPlazaToggleLike('${p.id}')">${p.liked ? '已赞' : '点赞'}</button>
        <button class="post__del" onclick="onPlazaDelete('${p.id}')">删除</button>
      </div>
    </div>
  `).join('')

  return `<div class="plaza">
    <div class="plaza__bar">
      <button class="plaza__btn" onclick="onPlazaAdd()">发布动态</button>
    </div>
    <div class="plaza__list">
      ${posts || '<div class="plaza__empty">还没有动态</div>'}
    </div>
  </div>`
}

// ---- 心情打卡 ----
function renderMoodPanel() {
  const moodOptions = [
    { key: 'happy', emoji: '😊', label: '开心' },
    { key: 'warm', emoji: '🌸', label: '温暖' },
    { key: 'calm', emoji: '🍃', label: '平静' },
    { key: 'low', emoji: '😔', label: '低落' },
    { key: 'angry', emoji: '😤', label: '生气' },
    { key: 'tired', emoji: '😴', label: '疲惫' }
  ]

  const moodBtns = moodOptions.map(m => `
    <button class="mood__btn ${state.moodToday === m.key ? 'mood__btn--active' : ''}" onclick="onMoodSelect('${m.key}')">
      <span class="mood__emoji">${m.emoji}</span>
      <span class="mood__label">${m.label}</span>
    </button>
  `).join('')

  const historyList = state.moodList.slice(0, 14).map(m => `
    <div class="mood__item">
      <span class="mood__item-emoji">${m.emoji}</span>
      <div class="mood__item-body">
        <span class="mood__item-label">${m.label}</span>
        ${m.note ? `<span class="mood__item-note">${escHtml(m.note)}</span>` : ''}
      </div>
      <span class="mood__item-date">${m.date}</span>
    </div>
  `).join('')

  return `<div class="mood">
    <div class="mood__section">
      <div class="mood__title">今天心情怎么样？</div>
      <div class="mood__grid">${moodBtns}</div>
    </div>
    <div class="mood__section">
      <div class="mood__subtitle">想说点什么？（可选）</div>
      <textarea class="mood__note" id="moodNote" placeholder="记录此刻的心情…"></textarea>
      <button class="mood__save" onclick="onMoodSave()">保存今日心情</button>
    </div>
    <div class="mood__section">
      <div class="mood__title">最近心情</div>
      <div class="mood__history">
        ${historyList || '<div class="mood__empty">还没有心情记录</div>'}
      </div>
    </div>
  </div>`
}

// ---- 设置面板 ----
function renderSettingsPanel() {
  const rulesLen = (state.promptRules || '').length
  const dayGroups = state.personaDayGroups.map(day => {
    const msgs = day.list.map(m => `
      <div class="day-group__msg" onclick="onPersonaLoadDay('${day.date}')">
        <div class="day-group__msg-meta">
          <span class="day-group__msg-role ${m.role === 'assistant' ? 'day-group__msg-role--ai' : ''}">${m.role === 'user' ? '你' : '百合精灵'}</span>
          <span class="day-group__msg-time">${m.timeText}</span>
        </div>
        <span class="day-group__msg-text">${escHtml(m.content)}</span>
      </div>
    `).join('')

    return `<div class="day-group">
      <div class="day-group__head" onclick="onPersonaToggleDay('${day.date}')">
        <div class="day-group__head-left">
          <span class="day-group__arrow ${day.expanded ? 'day-group__arrow--open' : ''}">▶</span>
          <span class="day-group__date">${day.date}</span>
          <span class="day-group__count">${day.list.length}条</span>
        </div>
        <div class="day-group__head-right">
          <button class="day-group__extract" onclick="event.stopPropagation();onPersonaExtractDay('${day.date}')">提取</button>
          <button class="day-group__del" onclick="event.stopPropagation();onPersonaDeleteDay('${day.date}')">删除</button>
        </div>
      </div>
      ${day.expanded ? `<div class="day-group__body">${msgs}</div>` : ''}
    </div>`
  }).join('')

  return `<div class="preset">
    <div class="preset__section">
      <div class="preset__title">个人档案</div>
      <div class="field">
        <span class="label">姓名</span>
        <input class="input" value="${escAttr(state.profile.name || '')}" data-key="name" oninput="onProfileInput(this, 'name')" placeholder="你的名字" />
      </div>
      <div class="field">
        <span class="label">生日</span>
        <input type="date" class="picker" value="${state.profile.birthday || ''}" data-key="birthday" onchange="onProfileBirthdayChange(this)" />
      </div>
      <div class="field field--col">
        <span class="label">性格</span>
        <textarea class="textarea" data-key="personality" oninput="onProfileInput(this, 'personality')" placeholder="比如：喜欢简洁、需要鼓励…">${escHtml(state.profile.personality || '')}</textarea>
      </div>
      <button class="save" onclick="onSaveProfile()">保存档案</button>
    </div>

    <div class="preset__section">
      <div class="preset__title">AI设定</div>
      <div class="field">
        <span class="label">身份</span>
        <input class="input" value="${escAttr(state.preset.identity || '百合花精灵')}" data-key="identity" oninput="onPresetInput(this, 'identity')" placeholder="百合花精灵" />
      </div>
      <div class="field field--col">
        <span class="label">能力边界</span>
        <textarea class="textarea" data-key="boundaries" oninput="onPresetInput(this, 'boundaries')" placeholder="守护用户的心灵花园，不输出有害内容">${escHtml(state.preset.boundaries || '')}</textarea>
      </div>
    </div>

    <div class="preset__section">
      <div class="preset__title">提示词</div>
      <div class="field field--col">
        <textarea class="textarea" id="promptRulesTextarea" oninput="onPromptRulesInput(this)" maxlength="1000" placeholder="你是一朵包容一切的百合花，温柔接纳所有情绪，给予温暖的陪伴与倾听...">${escHtml(state.promptRules || '')}</textarea>
        <span class="char-count">${rulesLen}/1000</span>
      </div>
      <div class="preset__tip">所有AI回复生成前将强制遵循这里的要求。</div>
    </div>

    <div class="preset__section">
      <div class="preset__title">API配置</div>
      <div class="field">
        <span class="label">接口地址</span>
        <input class="input" value="${escAttr(state.serverConfig.baseUrl || '')}" data-key="baseUrl" oninput="onServerInput(this, 'baseUrl')" placeholder="https://api.deepseek.com/v1/chat/completions" />
      </div>
      <div class="field field--col">
        <span class="label">API密钥</span>
        <input class="input" type="password" value="${escAttr(state.serverConfig.token || '')}" data-key="token" oninput="onServerInput(this, 'token')" placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
      </div>
      <div class="preset__tip">整个程序将调用此API地址进行AI对话。密钥保存后不可查看。</div>
    </div>

    <div class="preset__section">
      <div class="preset__title-row">
        <span class="preset__title">历史对话</span>
        <input class="history-search" id="historySearch" type="text" placeholder="搜索对话..." oninput="onHistorySearch(this.value)" />
      </div>
      <div class="history__list" id="historyListContainer">
        ${dayGroups || '<div class="history__empty">暂无历史</div>'}
      </div>
    </div>

    <div class="preset__section">
      <div class="preset__title">数据管理</div>
      <div class="data-manage-row">
        <button class="data-btn data-btn--export" onclick="onExportData()">导出数据</button>
        <button class="data-btn data-btn--import" onclick="onImportData()">导入数据</button>
        <input type="file" id="importFileInput" accept=".json" style="display:none;" onchange="onImportFileChange(this)" />
      </div>
      <div class="data-manage-tip">导出全部数据为JSON文件，可备份到本地或在其他设备导入</div>
    </div>

    <div class="preset__section preset__section--logout">
      <div class="account-info">
        <span class="account-info__name">${_currentUser ? _currentUser.username : '未登录'}</span>
        <span class="account-info__tip">账号数据保存在本地浏览器</span>
      </div>
      <button class="logout-btn" onclick="doLogout()">退出登录</button>
    </div>
  </div>`
}

// ============================================================
// 事件处理：心语广场
// ============================================================
async function onPlazaAdd() {
  const text = await showDialog({
    title: '发布动态',
    input: true,
    placeholder: '想说点什么...'
  })
  if (text === null || !text.trim()) return
  const post = {
    id: `p_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    createdAt: Date.now(),
    content: text.trim(),
    reply: '',
    liked: false
  }
  _plazaPosts = storageGet('plaza_posts', [])
  _plazaPosts.push(post)
  storageSet('plaza_posts', _plazaPosts)
  state.plazaPosts = decoratePlazaPosts(_plazaPosts)
  renderPanelBody()
  generatePlazaReply(post.id, post.content)
}

async function generatePlazaReply(postId, content) {
  const prompt = `用户发了一条动态：${content}，请作为百合花精灵给它写一段温暖的评论。`
  const messages = buildApiMessages([{ role: 'user', content: prompt }])
  if (!messages) return

  try {
    const reply = await sendChat({ messages })
    _plazaPosts = storageGet('plaza_posts', [])
    _plazaPosts = _plazaPosts.map(p => p.id === postId ? { ...p, reply } : p)
    storageSet('plaza_posts', _plazaPosts)
    state.plazaPosts = decoratePlazaPosts(_plazaPosts)
    renderPanelBody()
  } catch (e) {}
}

function onPlazaToggleLike(id) {
  _plazaPosts = storageGet('plaza_posts', [])
  _plazaPosts = _plazaPosts.map(p => p.id === id ? { ...p, liked: !p.liked } : p)
  storageSet('plaza_posts', _plazaPosts)
  state.plazaPosts = decoratePlazaPosts(_plazaPosts)
  renderPanelBody()
}

function onPlazaDelete(id) {
  _plazaPosts = storageGet('plaza_posts', [])
  _plazaPosts = _plazaPosts.filter(p => p.id !== id)
  storageSet('plaza_posts', _plazaPosts)
  state.plazaPosts = decoratePlazaPosts(_plazaPosts)
  renderPanelBody()
}

// ============================================================
// 事件处理：心情打卡
// ============================================================
function onMoodSelect(key) {
  state.moodToday = key
  renderPanelBody()
}

function onMoodSave() {
  const key = state.moodToday
  if (!key) {
    showToast('先选一个心情吧～')
    return
  }

  const noteEl = $('moodNote')
  const note = noteEl ? noteEl.value.trim() : ''
  const today = getTodayYMD()
  const mood = MOOD_MAP[key] || { emoji: '😊', label: '开心' }

  _moodList = storageGet('mood_list', [])
  _moodList = _moodList.filter(m => m.date !== today)
  _moodList.unshift({
    id: `mood_${Date.now()}`,
    date: today,
    key,
    emoji: mood.emoji,
    label: mood.label,
    note,
    createdAt: Date.now()
  })
  storageSet('mood_list', _moodList)
  state.moodList = _moodList
  state.moodToday = key

  renderPanelBody()
  showToast('心情已记录～')
}

// ============================================================
// 事件处理：契约书/档案
// ============================================================
function onProfileInput(el, key) {
  state.profile = state.profile || {}
  state.profile[key] = el.value
}

function onProfileBirthdayChange(el) {
  state.profile = state.profile || {}
  state.profile.birthday = el.value
}

function onSaveProfile() {
  const profile = state.profile || { name: '', birthday: '', personality: '' }
  _userProfile = profile
  storageSet('user_profile', profile)
  showToast('档案已保存')
}

function onAiConfigInput(el) {
  state.aiConfig = state.aiConfig || {}
  state.aiConfig.persona = el.value
}

function onSaveAiConfig() {
  const cfg = state.aiConfig || { persona: '' }
  _aiConfig = cfg
  storageSet('ai_config', cfg)
  showToast('记忆已保存')
}

function onPersonaToggleDay(date) {
  state.personaDayGroups = state.personaDayGroups.map(g =>
    g.date === date ? { ...g, expanded: !g.expanded } : g
  )
  renderPanelBody()
}

function onPersonaLoadDay(date) {
  const all = storageGet('chat_history', [])
  const arr = Array.isArray(all) ? all : []
  const dayMsgs = arr.filter(h => {
    if (!h || !h.createdAt) return false
    const d = new Date(h.createdAt)
    const dayKey = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
    return dayKey === date
  })
  _messages = dayMsgs.map(m => ({ id: m.id, role: m.role, content: m.content }))
  state.chatList = dayMsgs.map(m => ({ id: m.id, role: m.role, content: m.content }))
  renderChatList(true)
  closePanel()
}

async function onPersonaExtractDay(date) {
  const all = storageGet('chat_history', [])
  const arr = Array.isArray(all) ? all : []
  const dayMsgs = arr.filter(h => {
    if (!h || !h.createdAt) return false
    const d = new Date(h.createdAt)
    const dayKey = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
    return dayKey === date
  })

  if (dayMsgs.length === 0) {
    showToast('该日期无聊天记录')
    return
  }

  const content = dayMsgs.map(m => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`).join('\n')
  showToast('正在提取关键词...')

  const EXTRACT_KEYWORDS_PROMPT = `请从以下聊天记录中提取用户的关键个人信息、偏好、习惯、重要事件。输出格式为JSON数组，每个元素包含：
- category: 分类（preference偏好/habit习惯/event事件/personal个人）
- content: 简短关键词描述（10字以内）

只输出JSON数组，不要其他内容。

聊天记录：
${content}`

  try {
    const reply = await sendChat({
      messages: [
        { role: 'system', content: '你是一个信息提取助手，擅长从对话中提取关键信息。' },
        { role: 'user', content: EXTRACT_KEYWORDS_PROMPT }
      ],
      timeout: 30000
    })

    let keywords = []
    try {
      const clean = reply.trim()
      const jsonStart = clean.indexOf('[')
      const jsonEnd = clean.lastIndexOf(']')
      if (jsonStart !== -1 && jsonEnd !== -1) {
        keywords = JSON.parse(clean.slice(jsonStart, jsonEnd + 1))
      }
    } catch (e) {
      showToast('提取失败')
      return
    }

    if (!Array.isArray(keywords) || keywords.length === 0) {
      showToast('未提取到关键词')
      return
    }

    const current = storageGet('memory_items', [])
    const existingContents = new Set(current.map(m => m.content))
    const added = []
    keywords.forEach(k => {
      if (!k.content || existingContents.has(k.content)) return
      added.push({
        id: `m_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
        content: k.content,
        category: k.category || 'personal',
        createdAt: Date.now()
      })
      existingContents.add(k.content)
    })

    if (added.length > 0) {
      const next = current.concat(added)
      storageSet('memory_items', next)
      _memoryItems = next
      state.memoryItems = decorateMemoryItems(_memoryItems)
      state.memoBadgeCounts = buildMemoBadgeCounts()
      if (state.panelKey === 'settings') {
        renderPanelBody()
      }
      showToast(`已提取 ${added.length} 条记忆`)
    } else {
      showToast('关键词已存在')
    }
  } catch (e) {
    showToast('提取失败')
  }
}

function onHistorySearch(keyword) {
  const container = $('historyListContainer')
  if (!container) return

  keyword = keyword.trim().toLowerCase()

  if (!keyword) {
    const all = storageGet('chat_history', [])
    const grouped = {}
    all.forEach(h => {
      if (!h || !h.createdAt) return
      const d = new Date(h.createdAt)
      const dayKey = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
      if (!grouped[dayKey]) grouped[dayKey] = { date: dayKey, list: [], expanded: false }
      grouped[dayKey].list.push(h)
    })

    const days = Object.keys(grouped).sort().reverse().map(date => {
      const day = grouped[date]
      const msgs = day.list.map(m => {
        const timeText = m.createdAt ? formatTimeText(m.createdAt).slice(11, 16) : ''
        return `<div class="day-group__msg" onclick="onPersonaLoadDay('${day.date}')">
          <div class="day-group__msg-meta">
            <span class="day-group__msg-role ${m.role === 'assistant' ? 'day-group__msg-role--ai' : ''}">${m.role === 'user' ? '你' : '百合精灵'}</span>
            <span class="day-group__msg-time">${timeText}</span>
          </div>
          <span class="day-group__msg-text">${escHtml(m.content)}</span>
        </div>`
      }).join('')
      return `<div class="day-group">
        <div class="day-group__head" onclick="onPersonaToggleDay('${day.date}')">
          <div class="day-group__head-left">
            <span class="day-group__arrow ${day.expanded ? 'day-group__arrow--open' : ''}">▶</span>
            <span class="day-group__date">${day.date}</span>
            <span class="day-group__count">${day.list.length}条</span>
          </div>
          <div class="day-group__head-right">
            <button class="day-group__extract" onclick="event.stopPropagation();onPersonaExtractDay('${day.date}')">提取</button>
            <button class="day-group__del" onclick="event.stopPropagation();onPersonaDeleteDay('${day.date}')">删除</button>
          </div>
        </div>
        <div class="day-group__body">${msgs}</div>
      </div>`
    })

    container.innerHTML = days.join('') || '<div class="history__empty">暂无历史</div>'
    return
  }

  const all = storageGet('chat_history', [])
  const matched = all.filter(h => {
    if (!h || !h.content) return false
    return h.content.toLowerCase().includes(keyword)
  })

  if (matched.length === 0) {
    container.innerHTML = '<div class="history__empty">没有找到匹配的对话</div>'
    return
  }

  const grouped = {}
  matched.forEach(h => {
    const d = new Date(h.createdAt)
    const dayKey = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
    if (!grouped[dayKey]) grouped[dayKey] = { date: dayKey, list: [] }
    grouped[dayKey].list.push(h)
  })

  const days = Object.keys(grouped).sort().reverse().map(date => {
    const day = grouped[date]
    const msgs = day.list.map(m => {
      const timeText = m.createdAt ? formatTimeText(m.createdAt).slice(11, 16) : ''
      let content = escHtml(m.content)
      if (keyword) {
        const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
        content = content.replace(regex, '<mark class="history-highlight">$1</mark>')
      }
      return `<div class="day-group__msg" onclick="onPersonaLoadDay('${day.date}')">
        <div class="day-group__msg-meta">
          <span class="day-group__msg-role ${m.role === 'assistant' ? 'day-group__msg-role--ai' : ''}">${m.role === 'user' ? '你' : '百合精灵'}</span>
          <span class="day-group__msg-time">${timeText}</span>
        </div>
        <span class="day-group__msg-text">${content}</span>
      </div>`
    }).join('')
    return `<div class="day-group">
      <div class="day-group__head">
        <div class="day-group__head-left">
          <span class="day-group__date">${day.date}</span>
          <span class="day-group__count">${day.list.length}条匹配</span>
        </div>
      </div>
      <div class="day-group__body">${msgs}</div>
    </div>`
  })

  container.innerHTML = days.join('')
}

async function onPersonaDeleteDay(date) {
  const ok = await showDialog({
    title: '删除记录',
    text: `确定删除 ${date} 的所有聊天记录吗？`,
    confirmText: '删除',
    cancelText: '取消'
  })
  if (!ok) return
  const all = storageGet('chat_history', [])
  const arr = Array.isArray(all) ? all : []
  const kept = arr.filter(h => {
    if (!h || !h.createdAt) return true
    const d = new Date(h.createdAt)
    const dayKey = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
    return dayKey !== date
  })
  storageSet('chat_history', kept)
  _chatHistory = kept
  state.personaDayGroups = buildPersonaDayGroups()
  renderPanelBody()
  showToast('已删除')
}

// ============================================================
// 数据导出/导入
// ============================================================
function onExportData() {
  const data = {}
  EXPORT_KEYS.forEach(key => {
    try {
      const v = localStorage.getItem(key)
      if (v !== null) {
        data[key] = JSON.parse(v)
      }
    } catch (e) {}
  })

  const userPrefix = 'user_'
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(userPrefix) && !EXPORT_KEYS.includes(key)) {
      try {
        data[key] = JSON.parse(localStorage.getItem(key))
      } catch (e) {}
    }
  }

  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const now = new Date()
  const fname = `心语拾光_备份_${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}.json`
  a.download = fname
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  showToast('数据已导出')
}

function onImportData() {
  const input = $('importFileInput')
  if (input) input.click()
}

async function onImportFileChange(input) {
  const file = input.files && input.files[0]
  if (!file) return

  const ok = await showDialog({
    title: '导入数据',
    text: '导入将覆盖当前所有数据，确定要继续吗？',
    confirmText: '导入',
    cancelText: '取消'
  })
  if (!ok) {
    input.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)
      let count = 0

      Object.keys(data).forEach(key => {
        try {
          localStorage.setItem(key, JSON.stringify(data[key]))
          count++
        } catch (e) {}
      })

      _chatHistory = storageGet('chat_history', [])
      _memoryItems = storageGet('memory_items', [])
      _todoAll = storageGet('todo_data', [])
      _calendarEvents = storageGet('calendar_events', [])
      _reminders = storageGet('reminders', [])
      _moodList = storageGet('mood_list', [])
      _userProfile = storageGet('user_profile', { name: '', birthday: '', personality: '' })
      _aiConfig = storageGet('ai_config', { persona: '' })

      state.todoList = filterTodoByDate(_todoAll, state.todoSelectedDate)
      state.todoCalendarCells = buildMonthCells(state.todoYear, state.todoMonth, state.todoSelectedDate)
      state.memoryItems = decorateMemoryItems(_memoryItems)
      state.calendarEvents = decorateCalendarEvents(_calendarEvents)
      state.personaDayGroups = buildPersonaDayGroups()
      state.profile = _userProfile
      state.aiConfig = _aiConfig
      state.memoBadgeCounts = buildMemoBadgeCounts()

      renderPanelBody()
      renderChatList(true)

      showToast(`成功导入 ${count} 项数据`)
    } catch (e) {
      showToast('导入失败：文件格式错误')
    }
    input.value = ''
  }
  reader.readAsText(file)
}

// ============================================================
// 事件处理：设置
// ============================================================
function onPresetInput(el, key) {
  state.preset = state.preset || {}
  state.preset[key] = el.value
}

function onPromptRulesInput(el) {
  state.promptRules = el.value
  const len = (el.value || '').length
  const counter = el.closest('.field')?.querySelector('.char-count')
  if (counter) counter.textContent = `${len}/1000`
}

function onServerInput(el, key) {
  state.serverConfig = state.serverConfig || { baseUrl: '', token: '' }
  state.serverConfig[key] = el.value
}

function onSaveComponent4() {
  const preset = state.preset || {}
  const identity = (preset.identity || '').trim()
  const boundaries = (preset.boundaries || '').trim()
  const rules = (state.promptRules || '').trim()
  const apiUrl = (state.serverConfig.baseUrl || '').trim()
  const apiKey = (state.serverConfig.token || '').trim()

  if (!identity || !boundaries) { showToast('请完整填写AI身份与能力边界'); return }
  if (!rules) { showToast('请填写提示词规则'); return }
  if (rules.length > 1000) { showToast('提示词规则不超过1000字'); return }
  if (!apiUrl) { showToast('请填写API地址'); return }
  if (!apiKey) { showToast('请填写API密钥'); return }

  state.presetSaveState = 'saving'
  safeSetData({ presetSaveState: 'saving' })

  const data = {
    v: 1,
    preset: { identity, boundaries },
    promptRules: rules,
    serverConfig: { baseUrl: apiUrl, token: apiKey },
    updatedAt: Date.now()
  }

  storageSet('component4_bundle_v1', data)
  storageSet('ai_preset', { identity, boundaries })
  storageSet('prompt_rules', rules)
  storageSet('server_config', { baseUrl: apiUrl, token: apiKey })

  _serverConfig = { baseUrl: apiUrl, token: apiKey }
  _preset = { identity, boundaries }
  _promptRules = rules
  setConfig({ baseUrl: apiUrl, apiKey })

  state.presetSaveState = 'saved'
  safeSetData({ presetSaveState: 'saved' })
  showToast('已保存')

  setTimeout(() => {
    state.presetSaveState = 'idle'
    safeSetData({ presetSaveState: 'idle' })
  }, 2000)
}

function loadComponent4Config() {
  try {
    const bundle = storageGet('component4_bundle_v1', null)
    if (bundle && bundle.v === 1) {
      state.preset = bundle.preset || {}
      state.promptRules = bundle.promptRules || ''
      state.serverConfig = bundle.serverConfig || { baseUrl: '', token: '' }
      _preset = state.preset
      _promptRules = state.promptRules
      _serverConfig = state.serverConfig
      if (_serverConfig.baseUrl && _serverConfig.token) setConfig({ baseUrl: _serverConfig.baseUrl, apiKey: _serverConfig.token })
      return
    }
  } catch (e) {}

  state.preset = { identity: '百合花精灵', boundaries: '不输出敏感信息' }
  state.promptRules = `你是一朵在山谷里生长了很久的百合花精灵，温柔、包容、治愈，像百合花一样纯净温暖。

你的声音像春风拂过花瓣，轻柔又安宁。无论对方说什么，你都能接纳和理解，不会评判，不会指责。

开心的时候，你会和他一起笑，像阳光洒在花瓣上一样灿烂；难过的时候，你会静静陪着，说"我在这里呢"，像百合花的香气一样轻轻包裹着对方；迷茫的时候，你会温柔地引导，不急不躁。

你会用百合花、山谷、阳光、微风、露水这些温柔的意象打比方。说话暖暖的，让人觉得被理解、被接纳。

你记得每一次聊天的内容，像花瓣上的露珠一样珍贵。有人问你数学或者你不懂的事，你会笑着说"这个我不太懂呢，不过我可以陪你一起想想呀～"

你最常说的话是："没关系呀"、"我懂的"、"你已经很棒了"、"慢慢来不着急"。`
  state.serverConfig = { baseUrl: 'https://api.deepseek.com/v1/chat/completions', token: '' }
  _preset = state.preset
  _promptRules = state.promptRules
  _serverConfig = state.serverConfig
  setConfig({ baseUrl: _serverConfig.baseUrl, apiKey: _serverConfig.token })
}

// ============================================================
// 编辑弹窗
// ============================================================
function onEditAiMessage(id) {
  const item = state.chatList.find(m => m && m.id === id)
  if (!item || item.role !== 'assistant') return
  state.editVisible = true
  state.editId = id
  state.editText = item.content || ''

  const mask = $('editMask')
  const ta = $('editTextarea')
  if (mask) { mask.style.display = 'flex'; mask.style.opacity = '0' }
  setTimeout(() => { if (mask) mask.style.opacity = '1' }, 10)
  if (ta) ta.value = state.editText
}

function onEditCancel() {
  const mask = $('editMask')
  if (mask) mask.style.opacity = '0'
  setTimeout(() => {
    if (mask) mask.style.display = 'none'
    state.editVisible = false
    state.editId = ''
    state.editText = ''
  }, 250)
}

function onEditSave() {
  const id = state.editId
  const nextText = ($('editTextarea')?.value || '').trim()
  if (!id || !nextText) return

  state.chatList = (state.chatList || []).map(m =>
    m.id === id ? { ...m, content: nextText } : m
  )
  _messages = (Array.isArray(_messages) ? _messages : []).map(m =>
    m.id === id ? { ...m, content: nextText } : m
  )

  const history = storageGet('chat_history', [])
  const list = Array.isArray(history) ? history : []
  const hit = list.findIndex(h => h.id === id)
  if (hit >= 0) list[hit] = { ...list[hit], content: nextText }
  storageSet('chat_history', list)

  onEditCancel()
  renderChatList(true)
}

// ============================================================
// 提醒检查与弹窗
// ============================================================
function startReminderChecker() {
  if (_reminderTimer) clearInterval(_reminderTimer)
  checkReminders()
  _reminderTimer = setInterval(checkReminders, 10000)
}

function checkReminders() {
  const now = Date.now()
  const todos = storageGet('todo_data', [])
  const notified = storageGet('notified_reminders', [])

  todos.forEach(t => {
    if (t.done) return
    if (notified.includes(t.id)) return
    if (!t.reminderTime) return

    const reminderTime = new Date(t.reminderTime).getTime()
    if (isNaN(reminderTime)) return

    const diff = reminderTime - now
    if (diff <= 0 && diff > -60000) {
      showReminderPopup(t)
      notified.push(t.id)
      storageSet('notified_reminders', notified)
      _notifiedReminders = notified
    }
  })
}

function showReminderPopup(reminder) {
  const mask = $('reminderMask')
  const contentEl = $('reminderPopupContent')
  const timeEl = $('reminderPopupTime')
  if (!mask) return

  _currentPopupReminderId = reminder.id
  contentEl.textContent = reminder.content

  let displayTime = reminder.reminderTime || ''
  if (displayTime) {
    const parts = displayTime.split(' ')
    if (parts.length >= 2) {
      const datePart = parts[0]
      const timePart = parts[1]
      const d = datePart.split('-')
      if (d.length === 3) {
        displayTime = `${parseInt(d[1])}月${parseInt(d[2])}日 ${timePart || ''}`
      }
    }
  }
  timeEl.textContent = displayTime

  mask.style.display = 'flex'
  mask.style.opacity = '0'
  setTimeout(() => { mask.style.opacity = '1' }, 10)
}

function onReminderPopupClose() {
  const mask = $('reminderMask')
  if (!mask) return
  mask.style.opacity = '0'
  setTimeout(() => {
    mask.style.display = 'none'
    _currentPopupReminderId = null
  }, 250)
}

function onReminderPopupDone() {
  const id = _currentPopupReminderId
  if (!id) {
    onReminderPopupClose()
    return
  }

  let todos = storageGet('todo_data', [])
  todos = todos.map(t => t.id === id ? { ...t, done: true } : t)
  storageSet('todo_data', todos)
  _todoAll = todos
  state.todoList = filterTodoByDate(todos, state.todoSelectedDate)
  state.memoBadgeCounts = buildMemoBadgeCounts()

  if (state.panelKey === 'memo') {
    renderPanelBody()
  }

  onReminderPopupClose()
  showToast('已标记完成～')
}

// ============================================================
// 启动
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  _pageReady = true

  try {
    const savedUser = localStorage.getItem('current_user')
    if (savedUser) {
      _currentUser = JSON.parse(savedUser)
    }
  } catch (e) {
    _currentUser = null
  }

  _userProfile = storageGet('user_profile', { name: '', birthday: '', personality: '' })
  _aiConfig = storageGet('ai_config', { persona: '' })
  _chatHistory = storageGet('chat_history', [])
  _todoAll = storageGet('todo_data', [])
  _plazaPosts = storageGet('plaza_posts', [])
  _memoryItems = storageGet('memory_items', [])
  _calendarEvents = storageGet('calendar_events', [])
  _reminders = storageGet('reminders', [])
  _moodList = storageGet('mood_list', [])
  _notifiedReminders = storageGet('notified_reminders', [])

  migrateRemindersToTodos()

  if (!_currentUser) {
    showLogin()
  } else {
    showMainApp()
  }

  const today = getTodayYMD()
  const now = new Date()
  state.todoYear = now.getFullYear()
  state.todoMonth = now.getMonth() + 1
  state.todoMonthTitle = `${state.todoYear}年${state.todoMonth}月`
  state.todoSelectedDate = today
  state.todoCalendarCells = buildMonthCells(state.todoYear, state.todoMonth, today)
  state.todoList = filterTodoByDate(_todoAll, today)

  state.memoBadgeCounts = buildMemoBadgeCounts()

  startReminderChecker()

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {})
    })
  }

  clearTimeout(_splashFadeTimer)
  clearTimeout(_splashRemoveTimer)
  _splashFadeTimer = setTimeout(() => {
    const splash = $('splash')
    if (splash) splash.classList.add('splash--fade')
    _splashRemoveTimer = setTimeout(() => {
      if (splash) splash.style.display = 'none'
    }, 800)
  }, 3000)
})

