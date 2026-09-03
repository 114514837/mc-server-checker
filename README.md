# mc-server-checker

输入 Minecraft 服务器地址,查询服务器状态的小工具

## 功能

- 服务器在线状态检测(含图标)
- 当前在线人数 / 最大人数
- 服务器版本、协议号、服务端软件
- MOTD 显示(支持多行与 § 彩色代码)
- 在线玩家名单、模组/插件列表(服务器开启 query 时)
- 缓存时间显示
- 最近查询历史(localStorage)
- 离线与网络错误的友好提示

## 使用

浏览器打开 `index.html` 即可,查询时需联网

## 数据来源

通过 [mcstatus.io](https://mcstatus.io/docs) 免费公开 API 查询
(`https://api.mcstatus.io/v2/status/java/{地址}`),无需注册或 Key。
目前支持 Java 版服务器,地址可带端口,如 `1.2.3.4:25566`。
该 API 有缓存,结果非实时,页面会显示数据获取/过期时间。

## 项目结构

```
index.html  页面
style.css   样式
script.js   查询逻辑
```
