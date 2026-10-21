# ASMR One

一个用 [Scripting](https://scripting.fun) 写的 asmr.one 客户端。纯 TypeScript，跑在 iOS 上，界面照着 Apple Podcasts 和 Apple Music 的样子做。

不是下载器，不做缓存。音频和封面全部在线串流，本机只存播放记录。

## 功能

- **浏览**：主页推荐、按社团/标签/声优筛选、搜索（支持 `$tag:耳かき$` 语法）
- **作品页**：曲目树、时长、字幕（`.lrc`）、收藏
- **播放**：串流、后台播放、锁屏控制、断点续播、字幕随进度滚动
- **资料库**：收藏与最近播放
- **收听**：累计时长、时段分布、最常播放的单集、常听的声优
- **口味**：常听的社团与标签
- **分享**：一键生成长图卡片，存相册或分享

深浅色跟随系统。

## 安装

**一键导入（推荐）**

1. 在 App Store 装 **Scripting**（iOS 17+）
2. 点这个链接，App 会自动下载并导入：

   https://www.scripting.fun/import_scripts/?urls=%5B%22https%3A%2F%2Fgithub.com%2FMayntya%2Fasmr-one-scripting%2Freleases%2Fdownload%2Fv1.0.0%2FASMR-One.scripting%22%5D

3. 脚本列表里点 **ASMR One**

**手动安装**

下载 [ASMR-One.scripting](https://github.com/Mayntya/asmr-one-scripting/releases/download/v1.0.0/ASMR-One.scripting)，用 Scripting 打开。或者把仓库整个文件夹放进 `iCloud Drive/Scripting/scripts/ASMR One/`。

首次打开是空的，去「我的 → 账号」登录 asmr.one 之后就有内容了。

## 目录

```
index.tsx         入口，TabView + 播放器保活
script.json       脚本元信息
lib/
  api.ts          asmr.one 接口，多个网关自动切换
  player.ts       AVPlayer 封装、锁屏、断点
  store.ts        收藏/历史/收听记录，落 asmr-library.json
  stats.ts        统计聚合
  theme.ts        调色板
  artwork.ts      封面缓存
  lrc.ts          字幕解析
ui/
  DiscoverPage    浏览
  WorkDetail      作品详情
  PlayerPage      播放页
  QueuePage       播放列表
  LibraryPage     资料库 / 最近播放
  ProfilePage     我的
  StatsPage       收听
  RadarPage       口味
  StoragePage     存储
  ShareCard       分享卡片
  parts.tsx       Apple 风格列表原语
```

## 数据

所有接口都指向 asmr.one，没有第二个数据源。四条网关在 `lib/api.ts` 里，请求失败会自动换线并记住能用的那条。

本机数据只有一个 JSON：`Documents/asmr-library.json`，存收藏、最近播放和收听记录。删了不影响账号，只丢统计。

## 免责

本项目只是客户端，不托管、不分发任何音频。内容版权归 asmr.one 及各社团所有。请遵守源站条款，别拿去做批量抓取。使用前请确认你所在地的法律允许你访问这类内容。

## License

MIT

---

感谢世界第一可爱的蓝色大肥鱼🐳
