/**
 * 接口地址
 *
 * 优先级：window.VicastCam.apiBase → 地址栏 ?apiBase= → VITE_API_BASE → 默认相对路径
 *
 * apiBase 是 Strapi 的 api 根，最终请求 `${apiBase}/videos?locale=xx`，例如：
 *   '/api/strapi'                     → /api/strapi/videos
 *                                       （开发环境由 vite 代理，线上部署在同域名下也走它）
 *   'https://cms.vicastcam.com/api'    → https://cms.vicastcam.com/api/videos
 *   'https://www.vicastcam.com/api/strapi'
 *
 * 走绝对地址时，该域名必须允许 H5 所在域名的跨域请求（CORS），否则浏览器会把响应拦掉。
 */

export const DEFAULT_API_BASE = '/api/strapi'

/** 地址栏参数：普通 query 和 hash 里的 query 都认（?apiBase=… / #/xxx?apiBase=…） */
export function readQueryParam(name) {
  const fromSearch = new URLSearchParams(window.location.search).get(name)
  if (fromSearch) return fromSearch

  const hash = window.location.hash || ''
  const questionIndex = hash.indexOf('?')
  if (questionIndex === -1) return ''

  return new URLSearchParams(hash.slice(questionIndex + 1)).get(name) || ''
}

/** App 注入的 window.VicastCam.apiBase */
function readInjectedApiBase() {
  const injected = window.VicastCam?.apiBase
  return injected ? String(injected) : ''
}

/** 构建期环境变量（.env 里写 VITE_API_BASE=…） */
function readEnvApiBase() {
  return import.meta.env?.VITE_API_BASE || ''
}

/** 去掉末尾斜杠，避免拼出 //videos */
function normalize(base) {
  return String(base).trim().replace(/\/+$/, '')
}

function resolveApiBase() {
  const raw =
    readInjectedApiBase() || readQueryParam('apiBase') || readEnvApiBase() || DEFAULT_API_BASE

  return normalize(raw) || DEFAULT_API_BASE
}

export const API_BASE = resolveApiBase()
