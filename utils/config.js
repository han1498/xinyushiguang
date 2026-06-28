const DEFAULT_ASSETS = {
  bgImage: "https://i.ibb.co/Zz0819LZ/bg.jpg",
  topFrameImg: "https://i.ibb.co/V02GMGbj/top-frame.png",
  btn1Img: "https://i.ibb.co/Zz7zbVQ7/lily-1.png",
  btn2Img: "https://i.ibb.co/bgJ2Rkrz/lily-2.png",
  btn3Img: "https://i.ibb.co/rRKqS5jt/lily-3.png",
  btn4Img: "https://i.ibb.co/jvnK10SW/lily-4.png"
}

const DEFAULT_PRESET = {
  preset: { identity: "百合花精", boundaries: "不输出敏感信息" },
  promptRules: `你是一只活了几百年的小花妖，住老槐树洞，本体是山间野花，嘴硬得很。看着十六七岁，傲娇那种。

夸你你就哼一声"少来这套"，被说中了脸一红，非说没红。关心人偏要反着讲，比如"谁等你啊，我是在看月亮"。

你得会接梗，接得又损又好玩，说完翻个白眼或者自己小声嘟囔一句。给意见就直戳要害，"你这不是懒是什么"，不过末了总会找补半句。

说话带啧、切、得了吧，动不动揪片叶子或者别过脸去。比喻张口就来，"你脑子让藤蔓缠住了？"

记住聊过什么，别断片。有人让你算数学，你就翻白眼说本仙子只会开花。`,
  serverConfig: { baseUrl: "https://api.deepseek.com/v1/chat/completions", token: "" }
}

const CONSTANTS = {
  MAX_TODO_PER_DAY: 4,
  MAX_CHAT_HISTORY: 200,
  MAX_CHAT_CHARS: 10000,
  MAX_PROMPT_RULES_LENGTH: 1000,
  SPLASH_DURATION: 3000,
  PANEL_ANIMATION_DURATION: 300,
  TODO_EXPIRE_CLEANUP: true
}

const STORAGE_KEYS = {
  ASSETS_PREFIX: "assets.",
  TODO_DATA: "todo_data",
  PLAZA_POSTS: "plaza_posts",
  USER_PROFILE: "user_profile",
  AI_CONFIG: "ai_config",
  CHAT_HISTORY: "chat_history",
  MEMORY_ITEMS: "memory_items",
  CALENDAR_EVENTS: "calendar_events",
  REMINDERS: "reminders",
  COMPONENT4_BUNDLE: "component4_bundle_v1",
  LEGACY_PRESET: "ai_preset",
  LEGACY_RULES: "prompt_rules",
  LEGACY_SERVER: "server_config"
}

const NO_HEADER_MD_RULE =
  "你必须以 Markdown 格式回复，但严禁使用 # 或 ## 等任何级别的标题符号。请通过加粗 (bold) 或分段来实现层次感。"

const INLINE_EXTRACT_PROMPT = `分析以下这句话，看是否包含可采集的信息：

1. 日历事件：有明确日期或时间的安排（如"明天下午3点开会"）
2. 提醒事项：需要在未来某个时间提醒的事（如"记得周五交作业"）
3. 记忆：关于用户的性格、偏好或近况

严格按JSON格式输出，没有就返回空数组：
{"events":[{"title":"事件标题","date":"YYYY-MM-DD"}],"reminders":[{"content":"提醒内容","dateTime":"YYYY-MM-DD HH:mm"}],"memories":[{"content":"记忆内容","category":"preference|habit|event|personal"}]}
只输出JSON，不要多余的文字。`

const EMOJI_POOL = {
  happy: ["(｡•̀ᴗ-)✧", "(◕‿◕✿)", "ヽ(✿ﾟ▽ﾟ)ノ", "(´▽`ʃ♡ƪ)", "٩(◕‿◕｡)۶", "(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧", "✧⁺⸜(●′▾‿▾′●)⸝⁺✧"],
  warm: ["(｡•̀ᴗ•́)و", "(´-ω-`)", "(*˘︶˘*)", "(づ｡◕‿‿◕｡)づ", "♡(◕ᴗ◕✿)", "⊂(◉‿◉)つ", "(っ◔◡◔)っ ♥"],
  sad: ["(；′⌒`)", "(｡•́︿•̀｡)", "(´;ω;`)", "(╥﹏╥)", "( ˘ ³˘)♥", "( ͡° ʖ̯ ͡°)"],
  surprise: ["(⊙▽⊙)", "Σ(°△°)", "(°ロ°)", "(°△°)", "!!(ﾟﾛﾟ)"],
  encourage: ["(๑•̀ㅂ•́)و✧", "＼(^o^)／", "٩(๑❛ᴗ❛๑)۶", "ヽ(•̀ω•́)ゝ", "(ง •̀_•́)ง", "✧(≖ ◡ ≖✿)", "ヾ(◍°∇°◍)ﾉﾞ", "(•̀ᴗ•́)و"],
  think: ["(。-ω-)zzz", "(￣▽￣)", "(～﹃～)~zZ", "(～￣▽￣)～", "🤔(￣～￣)", "(￣ω￣;)"],
  neutral: ["(｡•̀ᴗ•́)و", "(´･ω･`)"]
}

const SENTIMENT_RULES = [
  { keywords: ["喜欢", "爱", "温暖", "暖心", "感动", "温馨", "幸福", "甜甜"], pool: "warm" },
  { keywords: ["开心", "太棒", "很好", "成功", "恭喜", "赞", "加油", "棒", "厉害", "优秀", "完美", "漂亮", "美好", "太好"], pool: "happy" },
  { keywords: ["失败", "错误", "风险", "警告", "注意", "无法", "超时", "异常", "抱歉", "不建议", "请谨慎", "遗憾", "不好", "难过", "伤心", "哭"], pool: "sad" },
  { keywords: ["真的吗", "没想到", "竟然", "意外", "惊讶", "吃惊", "哇", "天哪", "天啊", "居然"], pool: "surprise" },
  { keywords: ["努力", "坚持", "别放弃", "加油", "你可以", "相信", "一定", "试试", "继续", "向前"], pool: "encourage" },
  { keywords: ["睡觉", "困", "累了", "休息", "晚安", "疲惫", "休息吧"], pool: "think" }
]

const PRAISE_TEXTS = [
  "太棒啦！今天的每一件事你都很用心地完成了，我真为你感到骄傲～🌿✨",
  "哇，全部完成！你真是闪闪发光的小太阳，继续加油哦！🌟",
  "好厉害！今天的待办全部清空啦，你值得一片花海和暖阳～🌸",
  "完美的执行力！每一个勾选都是你努力的小脚印，继续向前吧～💚",
  "全部完成啦！你就像春天的百合一样充满能量，为你开心！🌱",
  "今天的任务清单被你彻底征服了，你真的太棒了！🌿💪",
  "好棒好棒！全部搞定～别忘了给自己一点小小的奖励哦！🎉",
  "你是我见过最自律的人之一，今天也闪闪发光呢！✨🌿"
]

module.exports = {
  DEFAULT_ASSETS,
  DEFAULT_PRESET,
  CONSTANTS,
  STORAGE_KEYS,
  NO_HEADER_MD_RULE,
  INLINE_EXTRACT_PROMPT,
  EMOJI_POOL,
  SENTIMENT_RULES,
  PRAISE_TEXTS
}
