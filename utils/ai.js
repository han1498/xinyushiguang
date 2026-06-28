let API_KEY = ""
let BASE_URL = ""

function setConfig(config) {
  if (config && config.baseUrl) BASE_URL = config.baseUrl
  if (config && config.apiKey) API_KEY = config.apiKey
}

function showRequestError(err) {
  const code = err?.code || err?.statusCode || "UNKNOWN"
  const message = err?.message || "请求失败"
  const detail = err?.detail
  const detailText =
    typeof detail === "string"
      ? detail
      : detail
        ? JSON.stringify(detail)
        : ""

  wx.showModal({
    title: "提示",
    content: `百合花的信号被微风吹散了，请检查网络。\n\n错误码：${code}\n错误描述：${message}${detailText ? `\n详情：${detailText}` : ""}`,
    showCancel: false,
    confirmText: "知道了"
  })
}

function sendChat(options) {
  const messages = Array.isArray(options?.messages) ? options.messages : []
  const model = options?.model || "deepseek-chat"
  const timeout = typeof options?.timeout === "number" ? options.timeout : 60000

  return new Promise((resolve, reject) => {
    try {
      if (!API_KEY) {
        const err = { code: "NO_API_KEY", message: "未配置 API_KEY（鉴权失败）" }
        showRequestError(err)
        return reject(err)
      }

      wx.request({
        url: BASE_URL,
        method: "POST",
        timeout,
        header: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`
        },
        data: {
          model,
          messages
        },
        success: (res) => {
          const statusCode = res?.statusCode
          const data = res?.data

          if (statusCode !== 200) {
            const err = {
              code: `HTTP_${statusCode}`,
              message: "接口返回非 200 状态码",
              detail: data
            }
            showRequestError(err)
            return reject(err)
          }

          if (data?.error) {
            const err = {
              code: data?.error?.code || "BIZ_ERROR",
              message: data?.error?.message || "接口业务错误",
              detail: data?.error
            }
            showRequestError(err)
            return reject(err)
          }

          const content = data?.choices?.[0]?.message?.content
          if (typeof content !== "string" || !content) {
            const err = {
              code: "EMPTY_REPLY",
              message: "响应解析失败：未获取到 reply content",
              detail: data
            }
            showRequestError(err)
            return reject(err)
          }

          resolve(content)
        },
        fail: (e) => {
          const err = {
            code: e?.errMsg?.includes("timeout") ? "TIMEOUT" : "NETWORK_ERROR",
            message: e?.errMsg || "网络请求失败",
            detail: e
          }
          showRequestError(err)
          reject(err)
        }
      })
    } catch (e) {
      const err = {
        code: "EXCEPTION",
        message: e?.message || "请求异常",
        detail: e
      }
      showRequestError(err)
      reject(err)
    }
  })
}

module.exports = {
  sendChat,
  setConfig
}
