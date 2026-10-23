# 🎧 ASMR One

asmr.one 的 iOS 客户端，用 [Scripting](https://scripting.fun) 写的纯 TypeScript。界面照着 Apple Music / Podcasts 的路子来，Liquid Glass 打底。

## 📦 装

先装 Scripting（iOS 17+），然后点：

**https://www.scripting.fun/import_scripts/?urls=%5B%22https%3A%2F%2Fgithub.com%2FMayntya%2Fasmr-one-scripting%2Freleases%2Flatest%2Fdownload%2FASMR-One.scripting%22%5D**

App 自己把包拉下来装好。这条链接永久有效，以后更新也是它。

手动的话下 [ASMR-One.scripting](https://github.com/Mayntya/asmr-one-scripting/releases/latest/download/ASMR-One.scripting) 用 Scripting 打开，或者把仓库整个文件夹丢进 `iCloud Drive/Scripting/scripts/ASMR One/`。

第一次打开是空的 —— 去「我的」登录自己的账号。密码不经手，token 只躺在你设备的存储里，退出登录就删。

---

## ✨ 能干什么

### 🎧 听

| | |
|---|---|
| 后台播放 | 锁屏、控制中心、耳机线控都在 |
| 断点续播 | 关掉再进来，从上次那一秒接着放 |
| 字幕 | `.lrc` 跟着进度滚，自动对齐 |
| 动态背景 | 播放页底色从封面里取，一首一个色 |
| 快进快退 | ±15 秒按钮，进度条直接拖 |
| 队列 | 播放页翻开曲目表，想跳哪条跳哪条 |

### 📥 离线下载

- 先挑再下 —— 同一部作品里 mp3 / wav 是同一个音声的不同版本，只下你要的那条
- 队列最多同时跑 **3 个**，其余自动排队，全部下完自己收工
- 进度环实时走，破折号不再卡在 0%
- 下载的东西按**作品**归类：存储页先列作品名，点进去才看得到逐条音轨
- 删一条、删一部、清空全部，都行
- 文件放 App Group，不进 iCloud 同步，也不出现在「文件」App 里

### 🔍 找

| | |
|---|---|
| 热门 | 按下载量排 |
| 主题特集 | 耳かき、囁き、添い寝……一屏一张大卡 |
| 新作速递 | 新上架里评分最高的那批 |
| 专题 | 来自 J-ASMR Wiki 的编辑整理，带中文简介和推荐语 |
| 分类 | CV、社团、标签，各有独立的横滑架子和完整列表页 |
| 搜索 | 标题、社团、声优随手打；`$tag:耳かき$` 这种标签语法也认 |

### 📚 资料库

收藏、最近播放、离线内容各一个分组。每一条都按名字配了色，点一下直接翻到对应作品。

### 📊 口味

收听时长、时段分布、常听的单集，社团和标签的横向占比条，全在一页里。数据从你自己听过的记录算。

### 🎨 外观

- 跟随系统 / 浅色 / 深色，三档随便切
- 11 种预设色调，樱粉、森绿、海蓝……连页面底色和卡片一起换
- 不爽预设就拖色相滑杆，0–360 度随便停

### 🖼 分享

作品页一键出图，存相册或者直接发出去。

---

## 🔧 代码

```
index.tsx         入口，TabView + 播放器保活
script.json       元信息
lib/api.ts        asmr.one 接口，多网关自动切换
lib/downloads.ts  离线下载：队列、落盘、索引
lib/player.ts     AVPlayer 封装、锁屏、断点
lib/store.ts      收藏/历史/收听，落 asmr-library.json
lib/stats.ts      统计聚合
lib/theme.ts      调色板、明暗模式、色调
lib/artwork.ts    封面缓存
lib/wiki.ts       J-ASMR Wiki 专题
lib/lrc.ts        字幕解析
ui/               页面，一个文件一屏
```

接口只连 asmr.one 和它的几个镜像，没有第二个数据源。本机数据两个地方：`Documents/asmr-library.json`（收藏、历史、统计）和 App Group 里的 `asmr-offline/`（离线音频）。删掉只丢记录和缓存，不影响账号。

## ⚠️ 别干的事

这只是个客户端，不托管也不分发任何音频，版权在源站和各社团手里。别拿它做批量抓取，别撞源站限流。另外先确认你那边允许访问这类内容。

MIT。

---

感谢世界第一可爱的蓝色大肥鱼 🐳
