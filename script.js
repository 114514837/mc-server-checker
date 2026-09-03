/* Minecraft 服务器状态查询(数据来源:https://api.mcstatus.io/v2/status/java) */

const form = document.getElementById("check-form");
const addressInput = document.getElementById("server-address");
const checkButton = document.getElementById("check-button");

const resultAddress = document.getElementById("result-address");
const resultStatus = document.getElementById("result-status");
const resultPlayers = document.getElementById("result-players");
const resultVersion = document.getElementById("result-version");
const resultMotd = document.getElementById("result-motd");
const formHint = document.getElementById("form-hint");
const advancedContent = document.getElementById("advanced-content");
const serverIcon = document.getElementById("server-icon");
const historyBox = document.getElementById("history-box");
const historyList = document.getElementById("history-list");

form.addEventListener("submit", (event) => {
  event.preventDefault(); // 阻止表单默认提交导致页面刷新
  handleCheck();
});

// 用户重新开始输入时,隐藏输入框下方的提示
addressInput.addEventListener("input", hideHint);

async function handleCheck() {
  const address = addressInput.value.trim();

  if (!address) {
    showHint("请输入服务器地址");
    addressInput.focus();
    return;
  }

  hideHint();

  checkButton.disabled = true;
  checkButton.textContent = "查询中…";
  showMessage("正在查询…");

  try {
    const response = await fetch("https://api.mcstatus.io/v2/status/java/" + encodeURIComponent(address));
    const data = await response.json();
    addHistory(address);
    showResult(address, data);
    renderAdvanced(data);
  } catch (error) {
    renderAdvanced(null);
    serverIcon.hidden = true;
    showMessage("查询失败:请检查网络后重试");
    resultPlayers.textContent = "—";
    resultVersion.textContent = "—";
    resultMotd.textContent = "暂时无法获取数据(网络错误或查询服务繁忙)";
  } finally {
    checkButton.disabled = false;
    checkButton.textContent = "查询";
  }
}

/* 兼容 version 是字符串或对象两种形态 */
function versionText(version) {
  if (!version) return null;
  if (typeof version === "string") return version;
  return version.name_clean || version.name_raw || null;
}

/* motd 内容可能是字符串,也可能是多行数组,统一成数组 */
function toLines(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [String(value)];
}

function showResult(address, data) {
  resultAddress.textContent = address;

  if (data.online) {
    resultStatus.textContent = "在线";
    resultStatus.className = "status-pill online";

    // 有图标就显示,没有则隐藏图片
    if (data.icon) {
      serverIcon.src = data.icon;
      serverIcon.hidden = false;
    } else {
      serverIcon.hidden = true;
    }

    resultPlayers.textContent = data.players.online + " / " + data.players.max;
    resultVersion.textContent = versionText(data.version) || "未知";

    // 优先用 raw 渲染彩色 MOTD;没有 raw 则退回纯文字
    resultMotd.textContent = "";
    const rawLines = data.motd ? toLines(data.motd.raw) : [];
    if (rawLines.length > 0) {
      rawLines.forEach(function (line, index) {
        if (index > 0) resultMotd.appendChild(document.createElement("br"));
        appendColoredLine(resultMotd, line);
      });
    } else {
      const cleanLines = data.motd ? toLines(data.motd.clean) : [];
      resultMotd.textContent = cleanLines.length > 0 ? cleanLines.join("\n") : "该服务器没有提供 MOTD";
    }
  } else {
    resultStatus.textContent = "离线";
    resultStatus.className = "status-pill offline";
    serverIcon.hidden = true;
    resultPlayers.textContent = "—";
    resultVersion.textContent = "—";
    resultMotd.textContent =
      "服务器没有响应。常见原因:地址拼错、服务器未开启、端口不是 25565、或服务器禁止查询。";
  }
}

function showMessage(message) {
  resultStatus.textContent = message;
  resultStatus.className = "status-pill waiting";
}

// 在输入框下方显示/隐藏提示
function showHint(text) {
  formHint.textContent = text;
  formHint.hidden = false;
}

function hideHint() {
  formHint.hidden = true;
}

/* ============================================================
 * 高级信息区:按 mcstatus.io 真实返回结构完整展示
 * 字段拿不到值也显示"无",不让信息悄悄消失
 * ============================================================ */

function pushAdvRow(rows, key, desc, value) {
  rows.push({ key: key, desc: desc, value: value });
}

// 时间可以是 ISO 字符串或毫秒数
function formatTime(value) {
  const date = new Date(value);
  return isNaN(date) ? null : date.toLocaleString("zh-CN", { hour12: false });
}

function renderAdvanced(data) {
  advancedContent.textContent = "";
  if (!data) return;

  const groups = [];

  // ---------- 1. 状态与连接 ----------
  const connection = [];
  pushAdvRow(connection, "online", "是否在线", data.online ? "在线" : "离线");
  pushAdvRow(connection, "host", "查询的域名", data.host || "无");
  pushAdvRow(connection, "ip_address", "服务器 IP", data.ip_address || "无");
  pushAdvRow(connection, "port", "端口", data.port != null ? String(data.port) : "无");
  pushAdvRow(connection, "srv_record", "SRV 解析记录", data.srv_record || "无(SRV 未启用)");
  groups.push({ title: "状态与连接", rows: connection });

  // ---------- 2. 版本与服务端 ----------
  const serverInfo = [];
  pushAdvRow(serverInfo, "version", "游戏版本", versionText(data.version) || "无");
  const protocol = data.version && typeof data.version === "object"
    ? data.version.protocol
    : data.protocol;
  pushAdvRow(serverInfo, "protocol", "协议号", protocol != null ? String(protocol) : "无");
  let softwareText = "无(服务器未上报)";
  if (data.software) {
    softwareText = typeof data.software === "string"
      ? data.software
      : data.software.name + (data.software.version ? " " + data.software.version : "");
  }
  pushAdvRow(serverInfo, "software", "服务端软件", softwareText);
  pushAdvRow(serverInfo, "eula_blocked", "是否被 EULA 拦截", data.eula_blocked ? "是" : "否");
  groups.push({ title: "版本与服务端", rows: serverInfo });

  // ---------- 3. 玩家 ----------
  if (data.players) {
    const playerRows = [];
    pushAdvRow(playerRows, "online", "当前在线人数", String(data.players.online));
    pushAdvRow(playerRows, "max", "最大人数", String(data.players.max));
    if (Array.isArray(data.players.list) && data.players.list.length > 0) {
      const lines = data.players.list.map(function (player) {
        return player.name + (player.uuid ? "  (" + player.uuid + ")" : "");
      });
      pushAdvRow(playerRows, "list", "在线玩家名单", lines.join("\n"));
    } else {
      pushAdvRow(playerRows, "list", "在线玩家名单", "空");
    }
    groups.push({ title: "玩家", rows: playerRows });
  }

  // ---------- 4. MOTD 与图标(纯文字 + 图标) ----------
  const motdRows = [];
  const cleanLines = data.motd ? toLines(data.motd.clean) : [];
  if (cleanLines.length > 0) {
    pushAdvRow(motdRows, "motd.clean", "纯文字", cleanLines.join("\n"));
  } else {
    pushAdvRow(motdRows, "motd.clean", "纯文字", "无");
  }
  if (data.icon) {
    pushAdvRow(motdRows, "icon", "服务器图标(64x64)", { type: "icon", src: data.icon });
  } else {
    pushAdvRow(motdRows, "icon", "服务器图标", "无");
  }
  groups.push({ title: "MOTD 与图标", rows: motdRows });

  // ---------- 5. 缓存时间 ----------
  const cacheRows = [];
  pushAdvRow(cacheRows, "retrieved_at", "数据获取时间", formatTime(data.retrieved_at) || "无");
  const expiresText = formatTime(data.expires_at);
  pushAdvRow(cacheRows, "expires_at", "缓存过期时间", expiresText || "无");
  if (data.expires_at && !isNaN(new Date(data.expires_at))) {
    const remain = Math.round((new Date(data.expires_at) - Date.now()) / 1000);
    pushAdvRow(cacheRows, "remaining", "距缓存过期", remain > 0 ? "约 " + remain + " 秒后重新探测" : "已过期,下次查询将重新探测");
  }
  groups.push({ title: "缓存信息", rows: cacheRows });

  // ---------- 6. 模组与插件 ----------
  const addonRows = [];
  ["mods", "plugins"].forEach(function (key) {
    const list = data[key];
    if (Array.isArray(list) && list.length > 0) {
      const names = list.slice(0, 15).map(function (m) {
        return m.name || JSON.stringify(m);
      });
      pushAdvRow(addonRows, key, "共 " + list.length + " 个", names.join("、") + (list.length > 15 ? "…" : ""));
    } else if (Array.isArray(list)) {
      pushAdvRow(addonRows, key, "", "无(0 个)");
    } else {
      pushAdvRow(addonRows, key, "", "无");
    }
  });
  if (addonRows.length > 0) {
    groups.push({ title: "模组与插件", rows: addonRows });
  }

  // ---------- 7. 未列出的字段 ----------
  const coveredKeys = [
    "online", "host", "port", "ip_address", "eula_blocked", "srv_record",
    "retrieved_at", "expires_at", "version", "players",
    "motd", "icon", "mods", "plugins", "software"
  ];
  const otherRows = [];
  Object.keys(data).forEach(function (key) {
    if (!coveredKeys.includes(key)) {
      pushAdvRow(otherRows, key, "", JSON.stringify(data[key]));
    }
  });
  if (otherRows.length > 0) {
    groups.push({ title: "其他字段", rows: otherRows });
  }

  // ---------- 渲染 ----------
  groups.forEach(function (group) {
    const groupEl = document.createElement("section");
    groupEl.className = "adv-group";

    const titleEl = document.createElement("h3");
    titleEl.className = "adv-group-title";
    titleEl.textContent = group.title;
    groupEl.appendChild(titleEl);

    group.rows.forEach(function (row) {
      const rowEl = document.createElement("div");
      rowEl.className = "adv-row";

      // 左侧:字段名 + 中文说明
      const keyEl = document.createElement("span");
      keyEl.className = "adv-key";
      const nameEl = document.createElement("span");
      nameEl.textContent = row.key;
      keyEl.appendChild(nameEl);
      if (row.desc) {
        const descEl = document.createElement("span");
        descEl.className = "adv-key-desc";
        descEl.textContent = row.desc;
        keyEl.appendChild(descEl);
      }
      rowEl.appendChild(keyEl);

      // 右侧:值(icon 用图片显示,其余用文字)
      const valueEl = document.createElement("span");
      valueEl.className = "adv-value";
      if (row.value && row.value.type === "icon") {
        const img = document.createElement("img");
        img.src = row.value.src;
        img.alt = "服务器图标";
        valueEl.appendChild(img);
      } else {
        valueEl.textContent = row.value;
      }
      rowEl.appendChild(valueEl);

      groupEl.appendChild(rowEl);
    });

    advancedContent.appendChild(groupEl);
  });
}

/* ============================================================
 * 彩色 MOTD:解析 § 颜色码,渲染成带颜色的文字
 * ============================================================ */

const MOTD_COLORS = {
  "0": "#000000", "1": "#0000AA", "2": "#00AA00", "3": "#00AAAA",
  "4": "#AA0000", "5": "#AA00AA", "6": "#FFAA00", "7": "#AAAAAA",
  "8": "#555555", "9": "#5555FF", a: "#55FF55", b: "#55FFFF",
  c: "#FF5555", d: "#FF55FF", e: "#FFFF55", f: "#FFFFFF"
};

// 把一行带 § 颜色码的文字拆成多个 span 追加到 container
// 用 createElement + textContent 而不是 innerHTML,
// 因为服务器文字不可信,不能当成 HTML 执行
function appendColoredLine(container, line) {
  const parts = line.split("§");
  let color = null;
  let bold = false;
  let italic = false;
  let underline = false;
  let strikethrough = false;

  function flush(text) {
    if (!text) return;
    const span = document.createElement("span");
    span.textContent = text;
    if (color) span.style.color = color;
    if (bold) span.style.fontWeight = "bold";
    if (italic) span.style.fontStyle = "italic";
    if (underline && strikethrough) {
      span.style.textDecoration = "underline line-through";
    } else if (underline) {
      span.style.textDecoration = "underline";
    } else if (strikethrough) {
      span.style.textDecoration = "line-through";
    }
    container.appendChild(span);
  }

  parts.forEach(function (part, index) {
    if (index === 0) {
      flush(part);
      return;
    }
    if (part.length === 0) return;
    const code = part[0]; // § 后面的一个字符就是颜色/格式码
    const text = part.slice(1);
    if (MOTD_COLORS[code]) {
      color = MOTD_COLORS[code];
    } else if (code === "r") {
      color = null;
      bold = false;
      italic = false;
      underline = false;
      strikethrough = false;
    } else if (code === "l") {
      bold = true;
    } else if (code === "o") {
      italic = true;
    } else if (code === "n") {
      underline = true;
    } else if (code === "m") {
      strikethrough = true;
    }
    // 其他码(k 乱码特效等)暂不处理
    flush(text);
  });
}

/* ============================================================
 * 最近查询历史(localStorage 保存,最多 8 条)
 * ============================================================ */

const HISTORY_KEY = "mc-server-history";
const HISTORY_MAX = 8;

function loadHistory() {
  try {
    const list = JSON.parse(localStorage.getItem(HISTORY_KEY));
    return Array.isArray(list) ? list : [];
  } catch (error) {
    return [];
  }
}

function addHistory(address) {
  // 去重并移到最前面,超过上限则截断
  let list = loadHistory().filter(function (item) {
    return item !== address;
  });
  list.unshift(address);
  if (list.length > HISTORY_MAX) list = list.slice(0, HISTORY_MAX);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  renderHistory();
}

// 从历史里删除一条
function removeHistory(address) {
  const list = loadHistory().filter(function (item) {
    return item !== address;
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  renderHistory();
}

function renderHistory() {
  const list = loadHistory();
  historyBox.hidden = list.length === 0;
  historyList.textContent = "";

  list.forEach(function (address) {
    const chip = document.createElement("span");
    chip.className = "history-chip";

    // 点名字重新查询
    const queryBtn = document.createElement("button");
    queryBtn.type = "button";
    queryBtn.className = "chip-query";
    queryBtn.textContent = address;
    queryBtn.title = "点击重新查询";
    queryBtn.addEventListener("click", function () {
      addressInput.value = address;
      handleCheck();
    });
    chip.appendChild(queryBtn);

    // 点×删除这条历史
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "chip-del";
    delBtn.textContent = "×";
    delBtn.title = "从历史中删除";
    delBtn.addEventListener("click", function () {
      removeHistory(address);
    });
    chip.appendChild(delBtn);

    historyList.appendChild(chip);
  });
}

renderHistory();
