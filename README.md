# mc-server-checker

输入 Minecraft 服务器地址,查询服务器状态的小工具。

## 功能

- 服务器在线状态检测
- 当前在线人数 / 最大人数
- 服务器版本
- MOTD 显示(支持多行)
- 离线与网络错误的友好提示

## 使用

浏览器直接打开 `index.html` 即可,无需安装,查询时需联网。

## 数据来源

通过 [mcsrvstat.us](https://api.mcsrvstat.us/) 免费 API 查询,无需注册或 Key。
目前支持 Java 版服务器,地址可带端口,如 `1.2.3.4:25566`。

## 项目结构

```
index.html  页面
style.css   样式
script.js   查询逻辑(fetch 调用 API 并渲染结果)
```
