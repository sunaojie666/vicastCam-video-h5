/**
 * 语言：App 端注入 window.VicastCam.language（1-25 的数字），换算成接口的 locale
 */

export const DEFAULT_LOCALE = 'en'

// 数字 → 接口 locale：接口实际支持的代码是逐个实测出来的，和 App 的枚举名不完全一样
export const LOCALE_BY_LANGUAGE = {
  1: 'en', // 英文
  2: 'zh-CN', // 简体中文（接口没有 zh-Hans）
  3: 'zh-TW', // 繁体中文（接口没有 zh-HK，只有 zh-TW）
  4: 'id', // 印尼语
  5: 'ms', // 马来语
  6: 'th', // 泰语
  7: 'vi', // 越南语
  8: 'fil', // 菲律宾语（接口是 fil，不是 fil-PH）
  9: 'en', // 缅甸语：接口没有这个语言，先用英文兜底
  10: 'es', // 西班牙语
  11: 'pt', // 葡萄牙语
  12: 'ar', // 阿拉伯语
  13: 'ja', // 日语
  14: 'tr', // 土耳其语
  15: 'it', // 意大利语
  16: 'de', // 德语
  17: 'fr', // 法语
  18: 'ko', // 韩语
  19: 'ru', // 俄语
  20: 'pl', // 波兰语
  21: 'nl', // 荷兰语
  22: 'hi', // 印地语
  23: 'ur', // 乌尔都语
  24: 'bn', // 孟加拉语
  25: 'fa' // 波斯语
}

// 兼容 App 直接注入语言名的情况（'en' / 'zh_Hans' / 'fil_PH' …）
export const LOCALE_BY_NAME = {
  en: 'en',
  zh_hans: 'zh-CN',
  zh_hk: 'zh-TW',
  id: 'id',
  ms: 'ms',
  th: 'th',
  vi: 'vi',
  fil_ph: 'fil',
  my_mm: 'en',
  es: 'es',
  pt: 'pt',
  ar: 'ar',
  ja: 'ja',
  tr: 'tr',
  it: 'it',
  de: 'de',
  fr: 'fr',
  ko: 'ko',
  ru: 'ru',
  pl: 'pl',
  nl: 'nl',
  hi: 'hi',
  ur: 'ur',
  bn: 'bn',
  fa: 'fa'
}

// 从右往左书写的语言
export const RTL_LOCALES = ['ar', 'ur', 'fa']

/** 读取 App 注入的 language 并换算成接口 locale */
export function resolveLocale() {
  const injected = window.VicastCam?.language
  if (injected === undefined || injected === null || injected === '') return DEFAULT_LOCALE

  const asNumber = Number(injected)
  if (Number.isInteger(asNumber)) return LOCALE_BY_LANGUAGE[asNumber] || DEFAULT_LOCALE

  const key = String(injected).toLowerCase().replace(/-/g, '_')
  return LOCALE_BY_NAME[key] || DEFAULT_LOCALE
}

// 本次页面使用的 locale。App 切换语言时会重新加载页面，所以取一次即可
export const locale = resolveLocale()

// 当前语言是否是 RTL
export const isRtl = RTL_LOCALES.includes(locale)

/**
 * 按语言设置 <html lang> 和 <html dir>
 * 阿拉伯语 / 乌尔都语 / 波斯语会把整个页面镜像成 RTL。
 * 布局用的是逻辑属性（inset-inline-end 等），所以镜像后自动生效。
 */
export function applyDirection() {
  document.documentElement.lang = locale
  document.documentElement.dir = isRtl ? 'rtl' : 'ltr'
}

