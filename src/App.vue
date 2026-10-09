<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'

// 语言：App 注入 window.VicastCam.language → 接口 locale（映射表在 utils/locale.js）
// App 切换语言时会重新加载页面，所以这里取一次即可
import { DEFAULT_LOCALE, locale } from '@/utils/locale'
// 接口地址：默认相对路径，也可由 App 注入或地址栏指定（解析顺序见 utils/config.js）
import { API_BASE } from '@/utils/config'
// 运行平台：电脑教程要按 iOS / 安卓藏掉用不上的那两节（判断顺序见 utils/platform.js）
import { platform } from '@/utils/platform'
import { callBridge } from '@/utils/bridge'

/* App 端注入的多语言文案：读 window.VicastCam.text
 *   window.VicastCam = { language: 2, apiBase: 'https://cms.vicastcam.com/api',
 *                        platform: 'ios',   // 'ios' / 'android'，电脑教程按它过滤（见 utils/platform.js）
 *                        text: { empty: '暂无内容', error: '加载失败，请稍后重试', close: '关闭' } }
 * 不注入就保持空白（不写死任何语言）
 */
const injectedText = window.VicastCam?.text || {}
const text = {
  empty: injectedText.empty || '',
  error: injectedText.error || '',
  close: injectedText.close || ''
}

/* 本地封面图：文件名与接口的 lesson.id 一一对应，如 beginner-1.png */
// 注意：这里用相对项目根目录的写法，用 '../assets/...' 在 build 阶段匹配不到文件
const coverModules = import.meta.glob('/src/assets/covers/*.png', { eager: true })
const covers = Object.fromEntries(
  Object.entries(coverModules).map(([path, mod]) => {
    const key = path.split('/').pop().replace(/\.png$/, '')
    // eager 导入得到的是模块对象，取 default 才是图片地址
    return [key, mod?.default ?? mod]
  })
)

const failed = ref(false)
const groups = ref([])
const activeKey = ref('')

/* ---------------- 当前展示的分组与列表 ---------------- */
const currentGroup = computed(() => groups.value.find((group) => group.key === activeKey.value))
const list = computed(() => currentGroup.value?.lessons || [])

// 序号补零：1 -> 01
function formatIndex(index, lesson) {
  const value = Number(lesson?.index ?? index + 1)
  return String(Number.isFinite(value) ? value : index + 1).padStart(2, '0')
}

/* ---------------- 按平台过滤：电脑教程里只留自己那两节 ---------------- */
// 电脑教程（computer）里苹果 / 安卓的连接方式各两节，只保留当前平台那一半：
//   iOS  → 去掉 computer-4 / computer-5（安卓有线和无线连接）
//   安卓 → 去掉 computer-2 / computer-3（苹果有线和无线连接）
// 桌面浏览器（platform 为 other）不隐藏，方便本地对照
const PLATFORM_HIDDEN_LESSON_IDS = {
  computer: {
    ios: ['computer-4', 'computer-5'],
    android: ['computer-2', 'computer-3']
  }
}

/**
 * 去掉当前平台用不上的课，并按显示顺序重排序号。
 * 有课被去掉时序号要跟着重排（否则 iOS 上电脑教程会从 01 直接跳到 06）。
 * 一节都没命中时原样返回，不动接口给的 index。
 */
function hidePlatformLessons(groupKey, rawLessons) {
  const hidden = PLATFORM_HIDDEN_LESSON_IDS[groupKey]?.[platform] || []
  if (!hidden.length) return rawLessons

  const kept = rawLessons.filter((lesson) => !hidden.includes(lesson.id))
  if (kept.length === rawLessons.length) return rawLessons

  return kept.map((lesson, order) => ({ ...lesson, index: order + 1 }))
}

// 切换分组，并让选中的胶囊滚进可视区域（各语言文案长短不一，一行放不下时可横向滑动）
async function selectGroup(key) {
  activeKey.value = key
  await nextTick()
  document
    .querySelector('.segments__item--active')
    ?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
}

/* ---------------- 拉取教程数据 ---------------- */
async function fetchGroups(localeCode) {
  const url = `${API_BASE}/videos?locale=${encodeURIComponent(localeCode)}`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const json = await res.json()
  const rawGroups = json?.data?.[0]?.data?.groups
  return Array.isArray(rawGroups) && rawGroups.length ? rawGroups : null
}

async function loadVideos() {
  failed.value = false

  try {
    // 接口不认识某个 locale 时会返回 200 + 空数据，所以这里再用英文兜底请求一次
    let rawGroups = await fetchGroups(locale)
    if (!rawGroups && locale !== DEFAULT_LOCALE) rawGroups = await fetchGroups(DEFAULT_LOCALE)
    if (!rawGroups) throw new Error('response has no groups')

    groups.value = rawGroups.map((group) => ({
      key: group.key,
      title: group.title,
      lessons: hidePlatformLessons(group.key, group.lessons || []).map((lesson) => ({
        id: lesson.id,
        index: lesson.index,
        title: lesson.title,
        time: lesson.time,
        video: lesson.video,
        // 优先用接口的封面字段，其次用本地同名封面图（beginner-1.png 对应 beginner-1）
        cover: lesson.cover || lesson.image || lesson.poster || covers[lesson.id] || ''
      }))
    }))
    activeKey.value = groups.value[0].key
  } catch (error) {
    // 失败原因（HTTP 404 / 跨域被拦 / 断网）会打到 console，连电脑用 Safari / Chrome 远程调试即可看到
    console.warn('[debug] 教程列表加载失败：', error?.message || error, '| API_BASE =', API_BASE)
    failed.value = true
  }
}

onMounted(loadVideos)

/* ---------------- 点击卡片：交给 App 播放 ---------------- */
// H5 自己不播放，把视频地址通过 H5Action 桥交给 App（type 1 = 播放视频）
function openItem(item) {
  if (!item?.video) return

  callBridge('H5Action', { type: 1, url: item.video, title: item.title })
}
</script>

<template>
  <div class="page">
    <!-- 分组切换 -->
    <!-- 常驻渲染：高度恒定，数据回来时胶囊出现不会把内容顶下去 -->
    <div class="segments">
      <!-- 横向滚动放在内层，粘性栏本身保持普通块级元素（iOS 上 sticky 自身带滚动会整条消失） -->
      <div class="segments__track">
        <button
          v-for="group in groups"
          :key="group.key"
          type="button"
          class="segments__item"
          :class="{ 'segments__item--active': activeKey === group.key }"
          @click="selectGroup(group.key)"
        >
          {{ group.title }}
        </button>
      </div>
    </div>

    <!-- 两列卡片列表 -->
    <div v-if="list.length" class="grid">
      <article v-for="(item, index) in list" :key="item.id" class="card" @click="openItem(item)">
        <div
          class="card__cover"
          :class="{ 'card__cover--image': item.cover }"
          :style="item.cover ? { backgroundImage: `url(${item.cover})` } : null"
        >
          <span class="card__index">{{ formatIndex(index, item) }}</span>
        </div>

        <h3 class="card__title text-ellipsis">{{ item.title }}</h3>
      </article>
    </div>

    <!-- 数据没回来之前什么都不显示；提示文案由 App 注入，没注入就保持空白 -->
    <p v-if="failed && text.error" class="empty">{{ text.error }}</p>
    <p v-else-if="groups.length && !list.length && text.empty" class="empty">{{ text.empty }}</p>

  </div>
</template>

<style scoped>
.page {
  padding-bottom: calc(var(--page-bottom-padding) + var(--safe-bottom));
}

/* ---------------- 分组切换 ---------------- */
.segments {
  /* 粘性定位：正常滚动吸顶，App 下拉刷新导致内容下移时跟着一起走 */
  position: sticky;
  inset-block-start: 0;
  z-index: 10;
  /* 高度写死（64px）：数据没回来时也是这个高度，胶囊出现时内容不跳 */
  height: calc(var(--safe-top) + 62px);
  padding-top: var(--safe-top);
  /* 自己的底色，否则卡片会从下面透上来 */
  background-color: var(--bg-card);
}

.segments__track {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 100%;
  padding: 0 14px;
  /* 英文 Beginner Tutorials / 德语文案更长，一行放不下就横向滑动 */
  overflow-x: auto;
  scrollbar-width: none;
}

.segments__track::-webkit-scrollbar {
  display: none;
}

.segments__item {
  /* 不收缩：横向滑动而不是压缩文字 */
  flex: 0 0 auto;
  height: 30px;
  padding: 0 13px;
  overflow: hidden;
  border-radius: var(--radius-full);
  color: var(--text-tab);
  font-size: 13px;
  white-space: nowrap;
}

.segments__item--active {
  color: #fff;
  background-image: var(--c-primary-gradient);
  box-shadow: 0 3px 8px var(--c-primary-shadow);
}

/* ---------------- 卡片列表 ---------------- */
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  padding: 0 14px;
}

.card {
  overflow: hidden;
  /* grid 子项默认 min-width:auto，标题不换行会把卡片撑宽，必须归零 */
  min-width: 0;
  border-radius: var(--radius-md);
  background-color: var(--bg-card);
  box-shadow: 0 2px 8px rgba(19, 44, 92, 0.08);
}

.card:active {
  transform: scale(0.98);
}

/* 封面：接口没给图片时用渐变占位，给了就显示图片 */
.card__cover {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background-color: #0b1533;
  background-image: radial-gradient(60% 55% at 50% 62%, rgba(76, 128, 255, 0.5), rgba(16, 28, 70, 0) 72%),
    linear-gradient(160deg, #0b1533 0%, #122052 45%, #090f24 100%);
  background-position: center;
  background-size: cover;
}

/* 占位图中间的手机轮廓 */
.card__cover::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 34%;
  height: 62%;
  border: 1px solid rgba(122, 168, 255, 0.45);
  border-radius: 6px;
  background-image: linear-gradient(180deg, rgba(120, 170, 255, 0.2), rgba(30, 60, 140, 0.3));
  box-shadow: 0 0 16px rgba(76, 128, 255, 0.5) inset, 0 0 18px rgba(76, 128, 255, 0.3);
  transform: translate(-50%, -50%);
}

.card__cover--image::before {
  content: none;
}

/* 右上角序号 */
.card__index {
  position: absolute;
  /* 用逻辑属性：LTR 贴右上角，RTL 自动镜像到左上角 */
  inset-block-start: 0;
  inset-inline-end: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 21px;
  padding: 0 8px;
  border-end-start-radius: 8px;
  color: #fff;
  font-size: 12px;
  background-image: var(--c-badge);
}

.card__title {
  padding: 10px;
  color: var(--text-1);
  font-size: 13px;
  font-weight: 400;
}

.empty {
  padding: 60px 0;
  color: var(--text-3);
  font-size: 13px;
  text-align: center;
}

</style>
