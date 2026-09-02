/* Minecraft 服务器状态查询(数据来源:https://api.mcsrvstat.us/) */

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
  showMessage("-");

  try {
    // mcsrvstat.us 会替我们 ping 目标服务器并返回 JSON
    const response = await fetch("https://api.mcsrvstat.us/2/" + address);
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
    resultVersion.textContent = data.version || "未知";

    // 优先用 raw 渲染彩色 MOTD;没有 raw 则退回纯文字
    resultMotd.textContent = "";
    if (data.motd && data.motd.raw && data.motd.raw.length > 0) {
      data.motd.raw.forEach(function (line, index) {
        if (index > 0) resultMotd.appendChild(document.createElement("br"));
        appendColoredLine(resultMotd, line);
      });
    } else if (data.motd && data.motd.clean) {
      resultMotd.textContent = data.motd.clean.join("\n");
    } else {
      resultMotd.textContent = "该服务器没有提供 MOTD";
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
 * 高级信息区:把 API 返回的所有字段分类展示
 * 数据来源:mcsrvstat.us /2/ 接口的 JSON
 * ============================================================ */

// 把"字段名 + 中文说明 + 值"记入 rows;值为空则跳过
function pushAdvRow(rows, key, desc, value) {
  if (value === undefined || value === null) return;
  rows.push({ key: key, desc: desc, value: value });
}

// 渲染整个高级信息区;data 为空时清空该区域
function renderAdvanced(data) {
  advancedContent.textContent = "";
  if (!data) return;

  const groups = [];

  // 1. 状态与连接
  const connection = [];
  pushAdvRow(connection, "online", "是否在线", data.online);
  pushAdvRow(connection, "hostname", "查询的域名", data.hostname);
  pushAdvRow(connection, "ip", "服务器 IP", data.ip);
  pushAdvRow(connection, "port", "端口", data.port);
  groups.push({ title: "状态与连接", rows: connection });

  // 2. 版本与服务端
  const serverInfo = [];
  pushAdvRow(serverInfo, "version", "游戏版本", data.version);
  pushAdvRow(serverInfo, "protocol", "协议号", data.protocol);
  pushAdvRow(serverInfo, "protocol_name", "协议名称", data.protocol_name);
  pushAdvRow(serverInfo, "software", "服务端软件", data.software);
  pushAdvRow(serverInfo, "eula_blocked", "是否被 EULA 拦截", data.eula_blocked);
  groups.push({ title: "版本与服务端", rows: serverInfo });

  // 3. 玩家
  if (data.players) {
    const playerRows = [];
    pushAdvRow(playerRows, "online", "当前在线人数", data.players.online);
    pushAdvRow(playerRows, "max", "最大人数", data.players.max);
    if (data.players.sample && data.players.sample.length > 0) {
      const names = data.players.sample.map(function (player) {
        return player.name;
      });
      pushAdvRow(playerRows, "sample", "在线玩家名单", names.join(", "));
    }
    groups.push({ title: "玩家", rows: playerRows });
  }

  // 4. MOTD 与图标
  const motdRows = [];
  if (data.motd && data.motd.clean && data.motd.clean.length > 0) {
    pushAdvRow(motdRows, "motd.clean", "纯文字", data.motd.clean.join("\n"));
  }
  if (data.icon) {
    pushAdvRow(motdRows, "icon", "服务器图标(64x64)", { type: "icon", src: data.icon });
  }
  if (motdRows.length > 0) {
    groups.push({ title: "MOTD 与图标", rows: motdRows });
  }

  // 5. 显示其他字段，防止 API 以后新增字段
  const coveredKeys = [
    "online", "hostname", "ip", "port", "version",
    "protocol", "protocol_name", "software", "eula_blocked",
    "players", "motd", "icon", "debug"
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

  // 按分组渲染成 DOM(用 textContent 写入,避免服务器内容注入 HTML)
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

      // 右侧:值
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
// 例如 §61.21.6§r:§6 金色,§r 恢复默认
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
      // 最开头可能有不带颜色码的文字
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

function renderHistory() {
  const list = loadHistory();
  historyBox.hidden = list.length === 0;
  historyList.textContent = "";

  list.forEach(function (address) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "history-chip";
    chip.textContent = address;
    chip.title = "点击重新查询";
    chip.addEventListener("click", function () {
      addressInput.value = address;
      handleCheck();
    });
    historyList.appendChild(chip);
  });
}

renderHistory();
