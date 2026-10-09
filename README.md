# 视频教程页（Vue 3 + JavaScript）

一个干净的移动端 H5 单页，纯 JavaScript，未使用 TypeScript，也没有路由等额外依赖。
页面只包含两块内容：顶部的胶囊切换，以及下面的两列教程卡片列表。

## 技术栈

- 构建：Vite
- 框架：Vue 3（`<script setup>` 组合式 API）
- 适配：`postcss-px-to-viewport-8-plugin`，设计稿按 375px 宽写 `px`，构建时自动换算成 `vw`

## 常用命令

```bash
npm install     # 安装依赖
npm run dev     # 本地开发，同时监听局域网 IP
npm run build   # 打包到 dist（相对路径，可放任意子目录）
npm run preview # 预览打包结果
```

## 手机访问（局域网 IP）

开发服务已配置为监听 `0.0.0.0`，启动后终端会打印两组地址：

```
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.18.100:5173/
```

手机连同一个 Wi-Fi / 局域网后，直接用终端里的 `Network` 地址打开即可。

- 换端口：`PORT=8080 npm run dev`（PowerShell 用 `$env:PORT=8080; npm run dev`）。
- 想让固定 IP 生效，建议在路由器里给本机绑定静态 IP，避免 IP 变化后地址失效。
- 页面顶部若出现 “Blocked request. This host is not allowed.” 这类提示，说明用了内网穿透域名，`allowedHosts` 已放开，无需额外配置。
- 手机打不开时按顺序排查：1) 确认手机和电脑在同一网段；2) 电脑上先访问 `http://本机IP:5173` 能否打开；3) Windows 防火墙是否放行 Node（见下）。

### Windows 防火墙放行

首次启动时如果弹过 “Windows 安全中心警报”，勾选专用/公用网络并点“允许访问”即可。若误点了取消，用管理员身份打开 PowerShell 执行一次（改成自己的 node 路径）：

```powershell
New-NetFirewallRule -DisplayName "Node Dev Server" -Direction Inbound -Program "D:\nvm\v24.16.0\node.exe" -Action Allow -Profile Any
```

## 目录结构

```
├── index.html          # HTML 模板（已配置移动端 viewport、禁止缩放）
├── vite.config.js      # 构建、@ 别名、接口代理、vw 适配
├── jsconfig.json       # 编辑器识别 @ 别名
└── src
    ├── assets/covers     # 教程封面图，文件名 = 接口的 lesson.id
    ├── main.js         # 入口，只挂载 App
    ├── App.vue         # 页面本体：切换 + 列表（结构 / 逻辑 / 样式都在这一个文件）
    ├── styles
    │   ├── index.css       # 全局样式，引入下面两个
    │   ├── reset.css       # 基础重置
    │   └── variables.css   # 主题色、间距、安全区变量
    └── utils
        ├── bridge.js       # 原生桥调用（H5Action）
        ├── config.js       # 接口地址解析（App 注入 / 地址栏 / 环境变量 / 默认）
        ├── platform.js     # 运行平台判断（iOS / 安卓 / 桌面），电脑教程按它过滤课程
        └── locale.js       # App 语言 → 接口 locale
```

## 页面结构

`src/App.vue` 里就三块：

1. 切换 `segments`：分组来自接口 `groups`，胶囊样式，选中蓝底白字。
2. 两列卡片 `grid`：封面右上角是序号（01、02…），下面是标题，超出自动省略。
3. 点击卡片：不播放视频，把视频地址通过 `H5Action` 桥交给 App。

切换栏用**粘性定位**（`position: sticky` + `inset-block-start: 0`），滚动时吸在顶部；
下拉刷新导致内容下移时它会跟着一起走，原生刷新头会出现在它上方。
栏的高度写死为 `--safe-top + 62px`，并且 `overflow-y: hidden`（只横向滚，不会被裁），
所以数据加载前后高度一致、滚动中不会变形；它自带白色底色（页面本身是透明的）。

## 接口

```js
const locale = resolveLocale()                // 从 window.VicastCam.language 换算
const res = await fetch(`${API_BASE}/videos?locale=${encodeURIComponent(locale)}`)
```

`API_BASE` 在 `src/utils/config.js` 里解析，按顺序取第一个有值的，最后兜底相对路径 `/api/strapi`：

| 顺序 | 来源 | 例子 |
| --- | --- | --- |
| 1 | App 注入 `window.VicastCam.apiBase` | `{ language: 2, apiBase: 'https://cms.vicastcam.com/api' }` |
| 2 | 地址栏参数 `?apiBase=`（hash 里的 query 也认） | `https://course.vicastcam.com/?apiBase=https%3A%2F%2Fcms.vicastcam.com%2Fapi` |
| 3 | 构建期环境变量 `VITE_API_BASE` | `.env` 里写 `VITE_API_BASE=https://cms.vicastcam.com/api` |
| 4 | 都没有 | `/api/strapi`（开发走 vite 代理，线上同域部署直接用） |

请求规则固定是 `${apiBase}/videos?locale={locale}`，`apiBase` 传的是 Strapi 的 api 根：
传 `https://cms.vicastcam.com/api` 就会请求 `https://cms.vicastcam.com/api/videos?locale=xx`。
线上目前用的是 `https://www.vicastcam.com/api/strapi/videos?locale={locale}`（www 的 nginx 转发到 Strapi，真正的 Strapi 在 `cms.vicastcam.com`）。

两个注意点：

- 默认的相对路径 `/api/strapi` **只在同域部署时可用**（部署在 www.vicastcam.com 下面）。部署在子域
  （比如 `course.vicastcam.com`）要么在服务器的 nginx 里把 `/api/strapi` 转发出去，要么按上表传绝对地址。
- 传绝对地址时，目标域名必须允许 H5 所在域名的跨域请求。`api.vicastcam.com` 已开 CORS（回显 Origin）；
  `cms.vicastcam.com` 是白名单制，目前只放了 `https://www.vicastcam.com`，要用得先让后端把 H5 的域名加进去。

### 语言：App 注入 → 接口 locale

App 端注入 `window.VicastCam.language`（1–25 的数字，Swift 枚举），换成接口的 locale 后再请求。
下面这张表里的 locale 是**逐个请求接口实测**出来的，注意接口后台配置的名字和 App 枚举名不一样：

| language | App 语言 | 接口 locale | 说明 |
| --- | --- | --- | --- |
| 1 | en 英文 | `en` | |
| 2 | zh_Hans 简体中文 | `zh-CN` | 接口没有 `zh-Hans` |
| 3 | zh_HK 繁体中文 | `zh-TW` | 接口没有 `zh-HK`，繁体只有 `zh-TW` |
| 4 | id 印尼语 | `id` | |
| 5 | ms 马来语 | `ms` | |
| 6 | th 泰语 | `th` | |
| 7 | vi 越南语 | `vi` | |
| 8 | fil_PH 菲律宾语 | `fil` | 接口是 `fil`，不是 `fil-PH` |
| 9 | my_MM 缅甸语 | 无 | 接口没有该语言，兜底用 `en` |
| 10–25 | es / pt / ar / ja / tr / it / de / fr / ko / ru / pl / nl / hi / ur / bn / fa | 同名 | 都与接口一致 |

几个实现细节：

- 取不到 `window.VicastCam.language`、或者值不在表里（比如 99），一律用 `en`。
- 也兼容 App 直接传语言名（`'en'` / `'zh_Hans'` / `'fil_PH'`），会自动归一化。
- 接口对**不认识的 locale 会返回 200 + 空数据**，所以代码在拿不到 groups 时会自动用 `en` 再请求一次兜底，避免白屏。
- 各语言的 `groups[].key` 和 `lessons[].id` 都是一样的（`beginner-1` 等），所以封面图不分语言、自动复用。
- **RTL**：阿拉伯语(12) / 乌尔都语(23) / 波斯语(25) 会把整个页面镜像 —— `applyDirection()` 设置 `<html dir="rtl">`，卡片顺序从右往左、序号贴左上角、文字右对齐。样式里用的是逻辑属性（`inset-inline-end`、`border-end-start-radius`），所以 LTR / RTL 共用一套 CSS。

### App 切换语言时

H5 只在**页面加载时**读一次 `window.VicastCam.language`，之后不再监听语言变化。
所以 App 切换语言后需要**重新加载 webview**，页面就会用新语言重新请求数据。

只要满足一个前提即可：新语言要在 H5 的 JS 执行之前注入好（iOS 用 `WKUserScript` document start、Android 在 `onPageStarted` 里注入），每次加载都注入。浏览器缓存不影响语言，因为语言是运行时注入的值。

字段映射（`data[0].data`）：

| 接口字段 | 用途 |
| --- | --- |
| `groups[].key` | 分组标识，切换时用 |
| `groups[].title` | 胶囊按钮文字（入门教程 / 高级教程 / 电脑教程） |
| `groups[].lessons[].index` | 卡片右上角序号 |
| `groups[].lessons[].title` | 卡片标题 |
| `groups[].lessons[].video` | 视频地址，点击时用 |
| `groups[].lessons[].time` | 视频时长（当前界面未展示，需要时可直接用） |

几个注意点：

- `locale` 由 App 注入的 `window.VicastCam.language` 换算得到（见上表）；页面提示文案 `text.empty` / `text.error` / `text.close` 也预留了注入位，目前是空字符串。
- 该接口**没有返回 CORS 头**，浏览器里跨域请求会被拦。开发环境已用 `vite.config.js` 里的 `/api/strapi` 代理绕过；上线时把 H5 部署在 `vicastcam.com` 同域名下，相对路径可直接用，或者由服务端补上 CORS 头。
- 接口**没有封面字段**，封面走本地图片：`src/assets/covers/` 里的文件名要和接口的 `lesson.id` 一致（如 `beginner-1.png` 对应 `beginner-1`、`computer-1.png` 对应 `computer-1`），代码里用 glob 自动按 id 匹配；三个分组（`beginner-1…11`、`advanced-1…6`、`computer-1…8`）目前都配好了封面，以后新增课程还没配图时会显示内置蓝色渐变占位图。接口以后补了 `cover` / `image` / `poster` 字段的话会优先用接口的。
- 数据回来之前页面不显示任何加载文案（多语言场景下由 App 注入，写死的中文没有意义）；加载失败和空列表的文案读
  `window.VicastCam.text.empty` / `text.error` / `text.close`，App 不注入就保持空白（失败时页面只剩顶部切换栏）。

### 加新封面图的两个坑

```js
// 1. 路径要写成相对项目根目录的 /src/...，写成 '../assets/...' 在 build 阶段会匹配不到文件
// 2. eager 导入拿到的是模块对象，要取 .default 才是图片地址
const coverModules = import.meta.glob('/src/assets/covers/*.png', { eager: true })
const covers = Object.fromEntries(
  Object.entries(coverModules).map(([path, mod]) => [path.split('/').pop().replace(/\.png$/, ''), mod.default])
)
```

新增图片时，只要把文件按 `分组-序号.png` 命名丢进 `src/assets/covers/` 即可，不用改代码。封面建议按 4:3 比例（如 368×276），和卡片封面框完全贴合、不会被裁切。

## 按平台隐藏课程（电脑教程）

电脑教程（`computer`）里苹果 / 安卓的连接方式各占两节，每个用户只用得上自己那一半，所以要按平台藏掉另外两节：

| 接口 id | 内容 | iOS | 安卓 | 桌面浏览器 |
| --- | --- | --- | --- | --- |
| `computer-2` | 苹果手机有线连接 | 保留 | **隐藏** | 保留 |
| `computer-3` | 苹果手机无线连接 | 保留 | **隐藏** | 保留 |
| `computer-4` | 安卓手机有线连接 | **隐藏** | 保留 | 保留 |
| `computer-5` | 安卓手机无线连接 | **隐藏** | 保留 | 保留 |

- iOS：去掉 `computer-4` / `computer-5`（安卓连接那两节）。
- 安卓：去掉 `computer-2` / `computer-3`（苹果连接那两节）。
- 只动 `computer` 这一组，入门教程 / 高级教程不受影响。

实现是 `src/utils/platform.js` 判断平台 + `App.vue` 里的 `hidePlatformLessons(groupKey, lessons)` 在数据进列表之前过滤（按 `lesson.id` 匹配，比按序号稳）。有课被去掉时序号会跟着重排，所以 iOS 上电脑教程是 01–06、不会从 01 直接跳到 06；封面按 `lesson.id` 匹配，过滤后照样对得上。

平台判断顺序（取第一个能识别的）：

| 顺序 | 来源 | 例子 |
| --- | --- | --- |
| 1 | App 注入 `window.VicastCam.platform` | `{ platform: 'ios' }`（`iphone` / `ipad` / `ipados` 都认，App 自己最清楚） |
| 2 | 地址栏参数 `?platform=ios`（hash 里的 query 也认） | 桌面浏览器调样式时用它模拟 |
| 3 | UA 判断 | iPhone / iPad / Android 关键字；iPadOS 13+ 的 UA 是 `Macintosh`，用触点数（`maxTouchPoints`）兜底 |

认不出来的一律算 `other`（桌面浏览器），**不隐藏任何课**，方便本地对照排查。
`main.js` 给 Android 加 `is-android` 类也是用这个判断（`isAndroid`），行为不变。

## 点击播放：交给 App 播放

H5 **不播放视频**，点卡片只把视频地址通过桥交给 App，由 App 自己播放：

```js
const H5_BRIDGE = 'H5Action'
// type: 1 = 播放视频
callBridge('H5Action', { type: 1, url: item.video, title: item.title })
```

桥的名称为 `H5Action`，事件对象是 `{ type: 1, url: "https://xxx.mp4", title: "课程标题" }`
（`title` 就是列表里显示的那条教程标题，App 可以直接拿来当播放页标题）。
各端注入方式不同，`src/utils/bridge.js` 会按下面的顺序依次尝试，命中哪个用哪个：

| 顺序 | 写法 | 常见端 |
| --- | --- | --- |
| 1 | `window.webkit.messageHandlers.H5Action.postMessage(对象)` | iOS WKWebView |
| 2 | `window.H5Action.postMessage(JSON 字符串)` | Android / 通用 |
| 3 | `window.H5Action(JSON 字符串)` | 直接可调用的写法 |

说明：

- 给 iOS 传的是**对象**，给 Android 传的是 **JSON 字符串**（Android 的 `@JavascriptInterface` 只认基本类型，直接传对象会变成 `[object Object]`）。
- 三条都不命中时 `callBridge` 返回 `false`，什么都不做（不会报错、不弹提示）。
- 卡片点击的逻辑在 `App.vue` 的 `openItem(item)`，要加别的类型（比如 type 2）照抄即可。

## 调试

页面里**没有**内置调试面板（原来的 vConsole 已删除，也没有对应依赖），日志走原生 `console`：

- 接口失败时 `App.vue` 会 `console.warn` 打出原因（`HTTP 404`、跨域被拦、断网）和 `API_BASE`。
- iOS：Safari → 开发 → 选中设备上的网页，用 Web Inspector 看 console / network。
- Android：Chrome 打开 `chrome://inspect`，连上设备里的 webview 调试。
- 桌面浏览器直接开 devtools，启动 `npm run dev` 后请求走 vite 代理（见「代理配置」）。

## 样式约定

- 样式里直接写 `px`，会按 375px 设计稿等比缩放到当前屏幕；不想被换算的元素加 `ignore-vw` 类名。
- 颜色、圆角、间距尽量用 `src/styles/variables.css` 里的 CSS 变量，改主题只需改一处。
- 顶部安全区、卡片圆角、阴影、序号与按钮的蓝色渐变都在变量里。

## 适配说明

1. 设计稿宽度按 375px 标注，写 `px` 即可，构建时自动换算成 `vw`。
2. 刘海屏和底部横条使用 `env(safe-area-inset-*)`，对应变量 `--safe-top`、`--safe-bottom`，固定定位元素记得留出内边距。
   - **Android 例外**：Android webview 会把状态栏/挖孔高度也算进 `env(safe-area-inset-top)`，而 App 已经让 webview 避开状态栏了，会重复留白（切换栏上方多一块）。所以 `main.js` 会给 Android 的 `<html>` 加 `is-android` 类（平台判断在 `utils/platform.js`），CSS 里把 `--safe-top` 归零；iOS 保持不变。
   - 如果 Android 上反而被状态栏压住（说明 App 没有让 webview 避开状态栏），把 `variables.css` 里 `:root.is-android { --safe-top: 0px }` 这行删掉即可。
3. 页面高度用 `100svh`（**不要用 `100vh`**：Android 上 `100vh` 是最大视口，会比可见区域高，底部多出一片可滚动空白）。

## 代理配置

`vite.config.js` 里有两段代理，按顺序匹配：

```js
'/api/strapi': { target: 'https://www.vicastcam.com', changeOrigin: true }
'/api':        { target: 'http://127.0.0.1:3000', rewrite: ... }
```

第一个是教程接口（路径原样转发，不做 rewrite）；第二个是留给自己的后端，联调时把 `target` 改成后端地址即可。
