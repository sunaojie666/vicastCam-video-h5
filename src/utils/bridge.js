/**
 * 原生桥调用
 *
 * 约定：桥名称 H5Action，事件对象形如
 *   { type: 1, url: 'https://xxx.mp4', title: '课程标题' }   // 1 = 播放视频
 * 各端注入方式不同，这里按常见形式依次尝试：
 *   1. iOS WKWebView：window.webkit.messageHandlers.H5Action.postMessage(obj)
 *   2. Android / 通用：window.H5Action.postMessage(jsonString)
 *   3. 直接可调的写法：window.H5Action(jsonString)
 *
 * @param {string} name 桥名称，如 'H5Action'
 * @param {object} payload 事件对象
 * @returns {boolean} 是否成功交给原生
 */
export function callBridge(name, payload) {
  const message = typeof payload === 'string' ? payload : JSON.stringify(payload)

  const iosHandler = window.webkit?.messageHandlers?.[name]
  if (typeof iosHandler?.postMessage === 'function') {
    iosHandler.postMessage(payload)
    return true
  }

  const handler = window[name]
  if (handler && typeof handler.postMessage === 'function') {
    // Android 的 @JavascriptInterface 只认基本类型，传字符串最稳
    handler.postMessage(message)
    return true
  }

  if (typeof handler === 'function') {
    handler(message)
    return true
  }

  return false
}
