# ASMR One

asmr.one 的 iOS 客户端，用 [Scripting](https://scripting.fun) 写，纯 TypeScript。界面照着 Apple Podcasts 和 Apple Music 来的。

音频全部在线串流，不下载不缓存。本机只留一点播放记录。

## 装

先装 Scripting（iOS 17 以上），然后点这个：

https://www.scripting.fun/import_scripts/?urls=%5B%22https%3A%2F%2Fgithub.com%2FMayntya%2Fasmr-one-scripting%2Freleases%2Flatest%2Fdownload%2FASMR-One.scripting%22%5D

App 会自己把包拉下来装好，脚本列表里就多了个 ASMR One。链接永久有效，以后更新也是这条。

不想点链接就手动下 [ASMR-One.scripting](https://github.com/Mayntya/asmr-one-scripting/releases/latest/download/ASMR-One.scripting)，用 Scripting 打开；或者把仓库整个文件夹丢进 `iCloud Drive/Scripting/scripts/ASMR One/`。

第一次打开是空的 —— 去「我的」登录你自己的 asmr.one 账号，才有东西看。我这边不碰你的密码，token 只留在你设备的 Scripting 存储里，退出就删。

## 有什么

主页推荐、按社团/标签/声优筛、搜索（`$tag:耳かき$` 这种语法也认）。

作品页是曲目树，带时长、字幕（`.lrc`）、心形收藏。

播放支持后台、锁屏控制、断点续播，字幕跟着进度滚。

资料库存收藏和最近播放。收听那页是累计时长、时段分布、最常听的那几集、常听的声优。口味是社团和标签的排行。两页里每一条都按名字配了色，点一下就翻到对应的作品。

还有个分享卡片，一键出图，存相册或者直接发出去。

深色浅色跟系统走。

## 代码

```
index.tsx         入口，TabView + 播放器保活
script.json       元信息
lib/api.ts        asmr.one 接口，多网关自动切换
lib/player.ts     AVPlayer 封装、锁屏、断点
lib/store.ts      收藏/历史/收听，落 asmr-library.json
lib/session.ts    上次播到哪儿
lib/stats.ts      统计聚合
lib/theme.ts      调色板
lib/artwork.ts    封面缓存
lib/lrc.ts        字幕解析
ui/               页面，一个文件一屏
```

接口只连 asmr.one 和它的几个镜像，没有第二个数据源。本机数据就一个 `Documents/asmr-library.json`，收藏、历史、收听记录都在里面，删了不影响账号，只丢统计。

## 别拿去干的事

这只是个客户端，不托管也不分发任何音频，版权都在源站和各社团手里。别拿它做批量抓取，别去撞源站的限流。另外先确认你那边允许访问这类内容。

MIT。

---

感谢世界第一可爱的蓝色大肥鱼🐳
