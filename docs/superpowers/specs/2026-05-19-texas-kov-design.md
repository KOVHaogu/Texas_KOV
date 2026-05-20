# 德州记分 — 设计文档

> 线下德州扑克计分微信小程序。酒吧/牌桌场景，操作极简、多人实时同步、无需注册登录。

---

## 一、技术架构

| 项目 | 决策 |
|------|------|
| 框架 | 微信小程序原生 |
| 后端 | 微信云开发 CloudBase |
| 环境 ID | `your-cloud-env-id` |
| AppID | `your-appid` |
| 实时同步 | 数据库 `watch()` API |
| 数据模型 | Game 单文档 + Record 子集合 |
| 并发控制 | 乐观锁（version 字段） |
| 最大人数 | 16 人 |
| 登录 | 微信默认身份，无需注册 |

---

## 二、数据模型

### Game 集合

```json
{
  "_id": "auto",
  "roomId": "5783",
  "version": 0,
  "status": "playing",
  "ownerId": "openid_xxx",
  "players": [
    {
      "playerId": "openid_xxx",
      "name": "张三",
      "avatar": "https://...",
      "score": 1000,
      "currentBet": 0
    }
  ],
  "pot": 0,
  "config": {
    "initialChips": 1000,
    "maxBet": null,
    "exchangeRate": 1
  },
  "createdAt": 1715770000000,
  "updatedAt": 1715770000000
}
```

- `version`：乐观锁，云函数更新时 `where({_id, version: old}).update({..., version: old+1})`，失败重试一次
- `players` 嵌入数组（≤16 人，~2KB），方便 `watch()` 单文档同步

### Record 集合（日志）

```json
{
  "roomId": "5783",
  "playerId": "openid_xxx",
  "playerName": "张三",
  "action": "bet",
  "amount": 50,
  "timestamp": 1715770000000
}
```

action 类型：`bet` | `win` | `new_game` | `settings_change` | `join` | `leave`

---

## 三、页面设计

### 1. 首页 `pages/index/index`

- 居中布局：品牌标题 + 「创建房间」按钮 + 房间号输入框 + 「加入」按钮
- 首次进入使用 `<button open-type="getUserProfile">` 获取头像昵称
- 创建房间：调用 `createRoom` 云函数 → 获得 4 位 roomId → 跳转房间
- 加入房间：输入 roomId → `joinRoom` 校验 → 跳转房间

### 2. 房间主界面 `pages/room/room`（核心页面）

**三区固定布局**：

| 区域 | 高度 | 行为 |
|------|------|------|
| 顶部栏 | 44px | 固定，房间号 + 右上菜单 |
| 信息栏 | ~80px | 固定，左：总池（大字）/ 右：最新日志（滚动） |
| 他人列表 | 弹性 | 可滚动，每人一行：头像 + 昵称 + 投注 + 总分，无按钮 |
| 我的操作区 | ~100px | 固定底部，头像+分+出/收大按钮 |

**交互规则**：
- 「出」→ 底部 picker：5/10/20/50/100/200 + ALL IN(红色) + 自定义输入
- 「收」→ `wx.showModal` 确认框「确定收下当前总投注池 X 分？」
- ALL IN 点击后二次确认（防误触）
- 防抖 500ms，触控区域 ≥ 44px
- 乐观更新：先更新本地 UI，云函数失败回滚 + Toast
- 断网监听 `wx.onNetworkStatusChange`，重连后重新 watch

**右上菜单**：
- 新的一局（仅房主）→ 重置 pot=0, scores=initialChips
- 筹码设置（仅房主）→ 弹窗表单
- 牌型说明 → 跳转 rules 页面
- 结算积分 → 跳转 result 页面（仅房主可操作结算）
- 分享房间 → 微信分享卡片

**退出房间**：房主退出时弹窗选择新主人；普通玩家直接退出，从 players 数组移除

### 3. 筹码设置弹窗（room 页面内）

- 初始筹码（整数，默认 1000）
- 单次下注上限开关 + 数值
- 汇率：1元 = X 积分
- 仅房主可见，调用 `updateConfig` 云函数保存

### 4. 结算页面 `pages/result/result`

**最少转账次数算法**：
1. 计算净盈亏 `net[i] = score[i] - initialChips`
2. 赢家按金额降序 / 输家按金额升序
3. 双指针贪心匹配，每次结清一方

**全局视图**（所有人可见）：转账清单 + 盈亏明细表  
**个人视图**（当前用户高亮）：支付/收到双卡片 + 净盈亏汇总  
**权限**：所有人可查看，仅房主可触发结算

### 5. 牌型说明 `pages/rules/rules`

- 静态列表页，10 种牌型从高到低排列
- 每种牌型附简短说明文字
- 皇家同花顺 / 同花顺 / 四条 / 葫芦 / 同花 / 顺子 / 三条 / 两对 / 一对 / 高牌

---

## 四、视觉设计

| 项目 | 决策 |
|------|------|
| 风格 | 暖色酒吧 — 深棕底色 + 暖橙点缀 |
| 主背景 | `#2c1810` |
| 深色面板 | `#1a0e08` |
| 分隔线 | `#3d2015` |
| 主文字 | `#dfe6e9` |
| 强调色 | `#e17055`（暖橙） |
| 金色高亮 | `#ffeaa7` |
| 辅助文字 | `#fab1a0` / `#636e72` |
| 出（下注） | `#00b894` 绿色 |
| 收（收池） | `#0984e3` 蓝色 |
| ALL IN | `#d63031` 红色 |
| 标准 | WCAG AA ≥ 4.5:1 |

---

## 五、云函数清单

| 云函数 | 功能 | 权限 |
|--------|------|------|
| `createRoom` | 生成不重复 4 位 roomId → 创建 Game 文档 | 任何人 |
| `joinRoom` | 校验存在 + 未满 → 添加玩家 → 返回 game | 任何人 |
| `bet` | 乐观锁更新 score/currentBet/pot → add Record | 任何人 |
| `win` | 乐观锁清空 pot → 所有 currentBet 清零 → add Record | 任何人 |
| `newGame` | 重置 scores + pot → add Record | 仅房主 |
| `updateConfig` | 更新 config 字段 | 仅房主 |
| `updatePlayerProfile` | 更新玩家头像/昵称 | 本人 |
| `leaveRoom` | 从 players 移除 → 若退出者是房主则转移 ownerId | 任何人 |
| `settle` | 运行最少转账次数算法 → 返回结果 | 仅房主 |
| `transferOwnership` | 转移房主给指定玩家 | 当前房主 |

**冲突处理**：bet/win 使用乐观锁（version 字段），更新前检查 version，失败后重新读取并重试一次。

---

## 六、文件结构

```
miniprogram/
├── app.js / app.json / app.wxss
├── pages/
│   ├── index/          (首页 — 创建/加入房间)
│   ├── room/           (房间主界面 — 核心页面)
│   ├── result/         (结算页)
│   └── rules/          (牌型说明)
├── components/
│   ├── player-card/    (玩家行组件，头像+昵称+投注+总分)
│   └── bet-picker/     (下注选择器，底部弹出)
├── utils/
│   └── settle.js       (结算算法，云函数引用)
└── cloudfunctions/
    ├── createRoom/
    ├── joinRoom/
    ├── bet/
    ├── win/
    ├── newGame/
    ├── updateConfig/
    ├── updatePlayerProfile/
    ├── leaveRoom/
    ├── settle/
    └── transferOwnership/
```

---

## 七、边界情况

- **网络断开**：`wx.onNetworkStatusChange` 监听，断网 Toast 提示，重连后重新 watch 拉最新数据
- **并发下注**：乐观锁 + 重试一次，第二次失败返回错误让用户重试
- **玩家已满**：joinRoom 返回错误 "房间已满（最多16人）"
- **房间不存在**：joinRoom 返回错误 "房间不存在"
- **房主退出**：弹窗选择新主人 → transferOwnership → leaveRoom
- **最后一人退出**：房间保留但无玩家，新玩家仍可加入
- **下注超额**：客户端校验 + 云函数二次校验，返回明确错误信息
