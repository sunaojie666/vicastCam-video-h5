/**
 * 运行平台
 *
 * 电脑教程（computer）里苹果 / 安卓的连接方式各占两节：
 *   computer-2 苹果手机有线连接   computer-3 苹果手机无线连接
 *   computer-4 安卓手机有线连接   computer-5 安卓手机无线连接
 * 每个用户只用得上自己那一半，所以页面要按平台把另外两节藏掉。
 *
 * 解析顺序（取第一个能识别的）：
 *   1. App 注入 window.VicastCam.platform（'ios' / 'android'，App 自己最清楚，iOS 上尤其推荐）
 *   2. 地址栏 ?platform=ios（hash 里的 query 也认）—— 桌面浏览器调样式时用它模拟
 *   3. UA 判断
 *
 * 取值只有三个：'ios' | 'android' | 'other'。
 * 'other' = 没认出来的桌面浏览器（本地 dev、App 没注入），不隐藏任何课，方便对照。
 */

import { readQueryParam } from './config'

const IOS = 'ios'
const ANDROID = 'android'
const OTHER = 'other'

/** 归一化注入值 / 地址栏参数：'iPhone'、'iPad'、'iPadOS' 都算 ios */
function normalize(value) {
  const key = String(value ?? '').trim().toLowerCase()
  if (!key) return ''

  if (key === 'ios' || key === 'iphone' || key === 'ipad' || key === 'ipados') return IOS
  if (key === 'android') return ANDROID
  if (key === 'other' || key === 'desktop') return OTHER

  // 认不出来的值（比如 App 传了 99）当没注入，继续往下走
  return ''
}

function fromUserAgent() {
  const ua = navigator.userAgent || ''

  if (/iphone|ipad|ipod/i.test(ua)) return IOS
  // iPadOS 13+ 的 UA 是 "Macintosh"，靠触点数区分 iPad 和真正的 Mac（Mac 的 maxTouchPoints 是 0）
  if (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return IOS
  if (/android/i.test(ua)) return ANDROID

  return OTHER
}

function resolvePlatform() {
  return (
    normalize(window.VicastCam?.platform) ||
    normalize(readQueryParam('platform')) ||
    fromUserAgent()
  )
}

/** 当前平台：'ios' | 'android' | 'other'。App 切换平台会重开页面，取一次即可 */
export const platform = resolvePlatform()

export const isIOS = platform === IOS

export const isAndroid = platform === ANDROID
