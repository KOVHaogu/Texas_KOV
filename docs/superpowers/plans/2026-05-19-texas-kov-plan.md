# 德州记分 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建完整的线下德州扑克记分微信小程序，包含 4 个页面、2 个组件、10 个云函数。

**Architecture:** 微信原生小程序 + CloudBase 云开发。Game 单文档 + Record 子集合数据模型，watch() 实时同步，乐观锁（version 字段）控制并发。

**Tech Stack:** 微信小程序原生框架、微信云开发 CloudBase (your-cloud-env-id)、JavaScript

---

## Phase 1: 项目脚手架

### Task 1: 项目根配置文件

**Files:**
- Create: `miniprogram/project.config.json`
- Create: `miniprogram/package.json`

- [ ] **Step 1: 创建 project.config.json**

```json
{
  "miniprogramRoot": "./",
  "cloudfunctionRoot": "cloudfunctions/",
  "setting": {
    "urlCheck": true,
    "es6": true,
    "enhance": true,
    "postcss": true,
    "preloadBackgroundData": false,
    "minified": true,
    "newFeature": true,
    "coverView": true,
    "nodeModules": false,
    "autoAudits": false,
    "showShadowRootInWxmlPanel": true,
    "scopeDataCheck": false,
    "uglifyFileName": false,
    "checkInvalidKey": true,
    "checkSiteMap": true,
    "uploadWithSourceMap": true,
    "compileHotReLoad": false,
    "lazyloadPlaceholderEnable": false,
    "useMultiFrameRuntime": true,
    "useApiHook": true,
    "useApiHostProcess": true,
    "babelSetting": {
      "ignore": [],
      "disablePlugins": [],
      "outputPath": ""
    }
  },
  "appid": "your-appid",
  "projectname": "texas-kov",
  "libVersion": "3.6.0",
  "cloudfunctionTemplateRoot": "cloudfunctionTemplate/",
  "condition": {},
  "srcMiniprogramRoot": "./"
}
```

- [ ] **Step 2: 创建 package.json**

```json
{
  "name": "texas-kov",
  "version": "1.0.0",
  "description": "线下德州扑克记分工具"
}
```

### Task 2: App 入口文件 + 全局样式

**Files:**
- Create: `miniprogram/app.js`
- Create: `miniprogram/app.json`
- Create: `miniprogram/app.wxss`

- [ ] **Step 1: 创建 app.js**

```js
App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: 'your-cloud-env-id',
        traceUser: true
      })
    }
  },
  globalData: {
    userInfo: null,
    openid: null
  }
})
```

- [ ] **Step 2: 创建 app.json**

```json
{
  "pages": [
    "pages/index/index",
    "pages/room/room",
    "pages/result/result",
    "pages/rules/rules"
  ],
  "window": {
    "backgroundTextStyle": "light",
    "navigationBarBackgroundColor": "#1a0e08",
    "navigationBarTitleText": "德州记分",
    "navigationBarTextStyle": "white",
    "backgroundColor": "#2c1810"
  },
  "style": "v2",
  "sitemapLocation": "sitemap.json"
}
```

- [ ] **Step 3: 创建 app.wxss**

```css
page {
  background-color: #2c1810;
  color: #dfe6e9;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
  font-size: 14px;
  --bg-primary: #2c1810;
  --bg-panel: #1a0e08;
  --border-color: #3d2015;
  --text-primary: #dfe6e9;
  --text-secondary: #636e72;
  --accent: #e17055;
  --accent-light: #fab1a0;
  --gold: #ffeaa7;
  --bet-green: #00b894;
  --win-blue: #0984e3;
  --danger-red: #d63031;
}

button {
  font-size: 16px;
}

button::after {
  border: none;
}
```

### Task 3: sitemap.json

**Files:**
- Create: `miniprogram/sitemap.json`

- [ ] **Step 1: 创建 sitemap.json**

```json
{
  "rules": [
    {
      "action": "allow",
      "page": "*"
    }
  ]
}
```

---

## Phase 2: 工具模块

### Task 4: 结算算法 `utils/settle.js`

**Files:**
- Create: `miniprogram/utils/settle.js`

- [ ] **Step 1: 实现最少转账次数算法**

```js
/**
 * 最少转账次数结算算法
 * @param {Array} players - [{playerId, name, score}]
 * @param {number} initialChips - 初始筹码
 * @param {number} exchangeRate - 汇率 1元 = X积分
 * @returns {{transfers: Array, playerDetails: Array}}
 */
function settle(players, initialChips, exchangeRate) {
  const net = players.map(p => ({
    playerId: p.playerId,
    name: p.name,
    score: p.score,
    net: p.score - initialChips
  }))

  const creditors = net.filter(p => p.net > 0).sort((a, b) => b.net - a.net)
  const debtors = net.filter(p => p.net < 0).sort((a, b) => a.net - b.net)

  const transfers = []
  let ci = 0, di = 0

  while (ci < creditors.length && di < debtors.length) {
    const amount = Math.min(creditors[ci].net, Math.abs(debtors[di].net))
    transfers.push({
      from: debtors[di].name,
      fromId: debtors[di].playerId,
      to: creditors[ci].name,
      toId: creditors[ci].playerId,
      amount: Math.round(amount / exchangeRate * 100) / 100
    })
    debtors[di].net += amount
    creditors[ci].net -= amount
    if (Math.abs(debtors[di].net) < 0.01) di++
    if (Math.abs(creditors[ci].net) < 0.01) ci++
  }

  const playerDetails = net.map(p => ({
    playerId: p.playerId,
    name: p.name,
    score: p.score,
    net: p.score - initialChips,
    netYuan: Math.round((p.score - initialChips) / exchangeRate * 100) / 100
  }))

  return { transfers, playerDetails }
}

module.exports = { settle }
```

---

## Phase 3: 云函数

### Task 5: createRoom 云函数

**Files:**
- Create: `miniprogram/cloudfunctions/createRoom/index.js`
- Create: `miniprogram/cloudfunctions/createRoom/package.json`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "createRoom",
  "version": "1.0.0",
  "dependencies": {
    "wx-server-sdk": "latest"
  }
}
```

- [ ] **Step 2: 创建 index.js**

```js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function generateRoomId() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const playerId = wxContext.OPENID
  const { name, avatar } = event

  for (let i = 0; i < 20; i++) {
    const roomId = generateRoomId()
    const existing = await db.collection('Game').where({ roomId, status: 'playing' }).get()
    if (existing.data.length === 0) {
      const game = {
        roomId,
        version: 0,
        status: 'playing',
        ownerId: playerId,
        players: [{
          playerId,
          name: name || '玩家',
          avatar: avatar || '',
          score: 1000,
          currentBet: 0
        }],
        pot: 0,
        config: {
          initialChips: 1000,
          maxBet: null,
          exchangeRate: 1
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      const result = await db.collection('Game').add({ data: game })
      await db.collection('Record').add({
        data: {
          roomId,
          playerId,
          playerName: name || '玩家',
          action: 'join',
          amount: 1000,
          timestamp: Date.now()
        }
      })
      return { code: 0, roomId, gameId: result._id }
    }
  }
  return { code: -1, msg: '创建房间失败，请重试' }
}
```

### Task 6: joinRoom 云函数

**Files:**
- Create: `miniprogram/cloudfunctions/joinRoom/index.js`
- Create: `miniprogram/cloudfunctions/joinRoom/package.json`

- [ ] **Step 1: 创建 package.json**（同上结构，name: "joinRoom"）

- [ ] **Step 2: 创建 index.js**

```js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const playerId = wxContext.OPENID
  const { roomId, name, avatar } = event

  const res = await db.collection('Game').where({ roomId, status: 'playing' }).get()
  if (res.data.length === 0) {
    return { code: -1, msg: '房间不存在' }
  }

  const game = res.data[0]
  if (game.players.length >= 16) {
    return { code: -1, msg: '房间已满（最多16人）' }
  }

  const alreadyIn = game.players.find(p => p.playerId === playerId)
  if (alreadyIn) {
    return { code: 0, gameId: game._id, game }
  }

  const newPlayer = {
    playerId,
    name: name || '玩家',
    avatar: avatar || '',
    score: game.config.initialChips,
    currentBet: 0
  }

  await db.collection('Game').doc(game._id).update({
    data: {
      players: db.command.push(newPlayer),
      updatedAt: Date.now()
    }
  })

  await db.collection('Record').add({
    data: {
      roomId,
      playerId,
      playerName: name || '玩家',
      action: 'join',
      amount: game.config.initialChips,
      timestamp: Date.now()
    }
  })

  return { code: 0, gameId: game._id }
}
```

### Task 7: bet 云函数

**Files:**
- Create: `miniprogram/cloudfunctions/bet/index.js`
- Create: `miniprogram/cloudfunctions/bet/package.json`

- [ ] **Step 1: 创建 package.json**（name: "bet"）

- [ ] **Step 2: 创建 index.js**

```js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const playerId = wxContext.OPENID
  const { roomId, amount } = event

  if (!amount || amount <= 0) {
    return { code: -1, msg: '下注金额无效' }
  }

  const res = await db.collection('Game').where({ roomId, status: 'playing' }).get()
  if (res.data.length === 0) {
    return { code: -1, msg: '房间不存在' }
  }

  const game = res.data[0]
  const playerIndex = game.players.findIndex(p => p.playerId === playerId)
  if (playerIndex === -1) {
    return { code: -1, msg: '你不在房间里' }
  }

  const player = game.players[playerIndex]
  if (player.score < amount) {
    return { code: -1, msg: '积分不足' }
  }
  if (game.config.maxBet && amount > game.config.maxBet) {
    return { code: -1, msg: `单次下注不能超过 ${game.config.maxBet}` }
  }

  const newPlayers = [...game.players]
  newPlayers[playerIndex] = {
    ...player,
    score: player.score - amount,
    currentBet: player.currentBet + amount
  }

  const updateRes = await db.collection('Game').where({
    _id: game._id,
    version: game.version
  }).update({
    data: {
      players: newPlayers,
      pot: game.pot + amount,
      version: game.version + 1,
      updatedAt: Date.now()
    }
  })

  if (updateRes.stats.updated === 0) {
    const retry = await db.collection('Game').doc(game._id).get()
    const retryGame = retry.data
    const retryPlayerIndex = retryGame.players.findIndex(p => p.playerId === playerId)
    const retryPlayer = retryGame.players[retryPlayerIndex]
    if (retryPlayer.score < amount) {
      return { code: -1, msg: '积分不足' }
    }
    const retryPlayers = [...retryGame.players]
    retryPlayers[retryPlayerIndex] = {
      ...retryPlayer,
      score: retryPlayer.score - amount,
      currentBet: retryPlayer.currentBet + amount
    }
    const retryUpdate = await db.collection('Game').where({
      _id: retryGame._id,
      version: retryGame.version
    }).update({
      data: {
        players: retryPlayers,
        pot: retryGame.pot + amount,
        version: retryGame.version + 1,
        updatedAt: Date.now()
      }
    })
    if (retryUpdate.stats.updated === 0) {
      return { code: -1, msg: '操作冲突，请重试' }
    }
  }

  await db.collection('Record').add({
    data: {
      roomId,
      playerId,
      playerName: player.name,
      action: 'bet',
      amount,
      timestamp: Date.now()
    }
  })

  return { code: 0 }
}
```

### Task 8: win 云函数

**Files:**
- Create: `miniprogram/cloudfunctions/win/index.js`
- Create: `miniprogram/cloudfunctions/win/package.json`

- [ ] **Step 1: 创建 package.json**（name: "win"）

- [ ] **Step 2: 创建 index.js**

```js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const playerId = wxContext.OPENID
  const { roomId } = event

  const res = await db.collection('Game').where({ roomId, status: 'playing' }).get()
  if (res.data.length === 0) {
    return { code: -1, msg: '房间不存在' }
  }

  const game = res.data[0]
  const playerIndex = game.players.findIndex(p => p.playerId === playerId)
  if (playerIndex === -1) {
    return { code: -1, msg: '你不在房间里' }
  }

  if (game.pot <= 0) {
    return { code: -1, msg: '总投注池为空' }
  }

  const potAmount = game.pot
  const newPlayers = game.players.map(p => ({
    ...p,
    currentBet: 0,
    score: p.playerId === playerId ? p.score + potAmount : p.score
  }))

  const updateRes = await db.collection('Game').where({
    _id: game._id,
    version: game.version
  }).update({
    data: {
      players: newPlayers,
      pot: 0,
      version: game.version + 1,
      updatedAt: Date.now()
    }
  })

  if (updateRes.stats.updated === 0) {
    const retry = await db.collection('Game').doc(game._id).get()
    const retryGame = retry.data
    if (retryGame.pot <= 0) {
      return { code: -1, msg: '总投注池为空' }
    }
    const retryPotAmount = retryGame.pot
    const retryPlayers = retryGame.players.map(p => ({
      ...p,
      currentBet: 0,
      score: p.playerId === playerId ? p.score + retryPotAmount : p.score
    }))
    const retryUpdate = await db.collection('Game').where({
      _id: retryGame._id,
      version: retryGame.version
    }).update({
      data: {
        players: retryPlayers,
        pot: 0,
        version: retryGame.version + 1,
        updatedAt: Date.now()
      }
    })
    if (retryUpdate.stats.updated === 0) {
      return { code: -1, msg: '操作冲突，请重试' }
    }
  }

  await db.collection('Record').add({
    data: {
      roomId,
      playerId,
      playerName: game.players[playerIndex].name,
      action: 'win',
      amount: potAmount,
      timestamp: Date.now()
    }
  })

  return { code: 0, amount: potAmount }
}
```

### Task 9: newGame 云函数

**Files:**
- Create: `miniprogram/cloudfunctions/newGame/index.js`
- Create: `miniprogram/cloudfunctions/newGame/package.json`

- [ ] **Step 1: 创建 package.json**（name: "newGame"）

- [ ] **Step 2: 创建 index.js**

```js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const playerId = wxContext.OPENID
  const { roomId } = event

  const res = await db.collection('Game').where({ roomId, status: 'playing' }).get()
  if (res.data.length === 0) {
    return { code: -1, msg: '房间不存在' }
  }

  const game = res.data[0]
  if (game.ownerId !== playerId) {
    return { code: -1, msg: '仅房主可操作' }
  }

  const newPlayers = game.players.map(p => ({
    ...p,
    score: game.config.initialChips,
    currentBet: 0
  }))

  await db.collection('Game').doc(game._id).update({
    data: {
      players: newPlayers,
      pot: 0,
      version: game.version + 1,
      updatedAt: Date.now()
    }
  })

  await db.collection('Record').add({
    data: {
      roomId,
      playerId,
      playerName: game.players.find(p => p.playerId === playerId)?.name || '',
      action: 'new_game',
      amount: 0,
      timestamp: Date.now()
    }
  })

  return { code: 0 }
}
```

### Task 10: updateConfig 云函数

**Files:**
- Create: `miniprogram/cloudfunctions/updateConfig/index.js`
- Create: `miniprogram/cloudfunctions/updateConfig/package.json`

- [ ] **Step 1: 创建 package.json**（name: "updateConfig"）

- [ ] **Step 2: 创建 index.js**

```js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const playerId = wxContext.OPENID
  const { roomId, config } = event

  const res = await db.collection('Game').where({ roomId, status: 'playing' }).get()
  if (res.data.length === 0) {
    return { code: -1, msg: '房间不存在' }
  }

  const game = res.data[0]
  if (game.ownerId !== playerId) {
    return { code: -1, msg: '仅房主可修改设置' }
  }

  await db.collection('Game').doc(game._id).update({
    data: {
      config: {
        initialChips: config.initialChips || 1000,
        maxBet: config.maxBet || null,
        exchangeRate: config.exchangeRate || 1
      },
      updatedAt: Date.now()
    }
  })

  await db.collection('Record').add({
    data: {
      roomId,
      playerId,
      playerName: game.players.find(p => p.playerId === playerId)?.name || '',
      action: 'settings_change',
      amount: 0,
      timestamp: Date.now()
    }
  })

  return { code: 0 }
}
```

### Task 11: updatePlayerProfile 云函数

**Files:**
- Create: `miniprogram/cloudfunctions/updatePlayerProfile/index.js`
- Create: `miniprogram/cloudfunctions/updatePlayerProfile/package.json`

- [ ] **Step 1: 创建 package.json**（name: "updatePlayerProfile"）

- [ ] **Step 2: 创建 index.js**

```js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const playerId = wxContext.OPENID
  const { roomId, name, avatar } = event

  const res = await db.collection('Game').where({ roomId, status: 'playing' }).get()
  if (res.data.length === 0) {
    return { code: -1, msg: '房间不存在' }
  }

  const game = res.data[0]
  const playerIndex = game.players.findIndex(p => p.playerId === playerId)
  if (playerIndex === -1) {
    return { code: -1, msg: '你不在房间里' }
  }

  const newPlayers = [...game.players]
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    name: name || newPlayers[playerIndex].name,
    avatar: avatar || newPlayers[playerIndex].avatar
  }

  await db.collection('Game').doc(game._id).update({
    data: {
      players: newPlayers,
      updatedAt: Date.now()
    }
  })

  return { code: 0 }
}
```

### Task 12: leaveRoom 云函数

**Files:**
- Create: `miniprogram/cloudfunctions/leaveRoom/index.js`
- Create: `miniprogram/cloudfunctions/leaveRoom/package.json`

- [ ] **Step 1: 创建 package.json**（name: "leaveRoom"）

- [ ] **Step 2: 创建 index.js**

```js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const playerId = wxContext.OPENID
  const { roomId } = event

  const res = await db.collection('Game').where({ roomId, status: 'playing' }).get()
  if (res.data.length === 0) {
    return { code: -1, msg: '房间不存在' }
  }

  const game = res.data[0]
  const player = game.players.find(p => p.playerId === playerId)
  if (!player) {
    return { code: -1, msg: '你不在房间里' }
  }

  const newPlayers = game.players.filter(p => p.playerId !== playerId)

  await db.collection('Game').doc(game._id).update({
    data: {
      players: newPlayers,
      updatedAt: Date.now()
    }
  })

  await db.collection('Record').add({
    data: {
      roomId,
      playerId,
      playerName: player.name,
      action: 'leave',
      amount: 0,
      timestamp: Date.now()
    }
  })

  return { code: 0, playerCount: newPlayers.length }
}
```

### Task 13: transferOwnership 云函数

**Files:**
- Create: `miniprogram/cloudfunctions/transferOwnership/index.js`
- Create: `miniprogram/cloudfunctions/transferOwnership/package.json`

- [ ] **Step 1: 创建 package.json**（name: "transferOwnership"）

- [ ] **Step 2: 创建 index.js**

```js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const playerId = wxContext.OPENID
  const { roomId, newOwnerId } = event

  const res = await db.collection('Game').where({ roomId, status: 'playing' }).get()
  if (res.data.length === 0) {
    return { code: -1, msg: '房间不存在' }
  }

  const game = res.data[0]
  if (game.ownerId !== playerId) {
    return { code: -1, msg: '仅房主可转让' }
  }

  const targetPlayer = game.players.find(p => p.playerId === newOwnerId)
  if (!targetPlayer) {
    return { code: -1, msg: '目标玩家不在房间内' }
  }

  await db.collection('Game').doc(game._id).update({
    data: {
      ownerId: newOwnerId,
      updatedAt: Date.now()
    }
  })

  return { code: 0 }
}
```

### Task 14: settle 云函数

**Files:**
- Create: `miniprogram/cloudfunctions/settle/index.js`
- Create: `miniprogram/cloudfunctions/settle/package.json`

- [ ] **Step 1: 创建 package.json**（name: "settle"）

- [ ] **Step 2: 创建 index.js**

```js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function settle(players, initialChips, exchangeRate) {
  const net = players.map(p => ({
    playerId: p.playerId,
    name: p.name,
    score: p.score,
    net: p.score - initialChips
  }))

  const creditors = net.filter(p => p.net > 0).sort((a, b) => b.net - a.net)
  const debtors = net.filter(p => p.net < 0).sort((a, b) => a.net - b.net)

  const transfers = []
  let ci = 0, di = 0

  while (ci < creditors.length && di < debtors.length) {
    const amount = Math.min(creditors[ci].net, Math.abs(debtors[di].net))
    transfers.push({
      from: debtors[di].name,
      fromId: debtors[di].playerId,
      to: creditors[ci].name,
      toId: creditors[ci].playerId,
      amount: Math.round(amount / exchangeRate * 100) / 100
    })
    debtors[di].net += amount
    creditors[ci].net -= amount
    if (Math.abs(debtors[di].net) < 0.01) di++
    if (Math.abs(creditors[ci].net) < 0.01) ci++
  }

  const playerDetails = net.map(p => ({
    playerId: p.playerId,
    name: p.name,
    score: p.score,
    net: p.score - initialChips,
    netYuan: Math.round((p.score - initialChips) / exchangeRate * 100) / 100
  }))

  return { transfers, playerDetails }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const playerId = wxContext.OPENID
  const { roomId } = event

  const res = await db.collection('Game').where({ roomId, status: 'playing' }).get()
  if (res.data.length === 0) {
    return { code: -1, msg: '房间不存在' }
  }

  const game = res.data[0]
  if (game.ownerId !== playerId) {
    return { code: -1, msg: '仅房主可结算' }
  }

  const result = settle(game.players, game.config.initialChips, game.config.exchangeRate)

  return {
    code: 0,
    result,
    config: {
      initialChips: game.config.initialChips,
      exchangeRate: game.config.exchangeRate
    }
  }
}
```

---

## Phase 4: 组件

### Task 15: player-card 组件

**Files:**
- Create: `miniprogram/components/player-card/player-card.js`
- Create: `miniprogram/components/player-card/player-card.wxml`
- Create: `miniprogram/components/player-card/player-card.wxss`
- Create: `miniprogram/components/player-card/player-card.json`

- [ ] **Step 1: 创建 player-card.json**

```json
{
  "component": true,
  "usingComponents": {}
}
```

- [ ] **Step 2: 创建 player-card.js**

```js
Component({
  properties: {
    player: {
      type: Object,
      value: {}
    },
    isSelf: {
      type: Boolean,
      value: false
    }
  },
  methods: {
    onTapAvatar() {
      const { player } = this.properties
      if (player.avatar) {
        wx.previewImage({
          urls: [player.avatar],
          current: player.avatar
        })
      }
    }
  }
})
```

- [ ] **Step 3: 创建 player-card.wxml**

```xml
<view class="player-row {{isSelf ? 'self' : ''}}">
  <image
    class="avatar"
    src="{{player.avatar || '/images/default-avatar.png'}}"
    mode="aspectFill"
    bindtap="onTapAvatar"
  />
  <text class="name">{{player.name}}</text>
  <text class="bet">投{{player.currentBet}}</text>
  <text class="score">{{player.score}}</text>
</view>
```

- [ ] **Step 4: 创建 player-card.wxss**

```css
.player-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #3d2015;
}
.player-row.self {
  padding: 4px 0;
}
.avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #3d2015;
}
.name {
  flex: 1;
  color: #dfe6e9;
  font-size: 13px;
}
.bet {
  color: #fab1a0;
  font-size: 12px;
}
.score {
  color: #ffeaa7;
  font-size: 13px;
  font-weight: 600;
  min-width: 50px;
  text-align: right;
}
```

### Task 16: bet-picker 组件

**Files:**
- Create: `miniprogram/components/bet-picker/bet-picker.js`
- Create: `miniprogram/components/bet-picker/bet-picker.wxml`
- Create: `miniprogram/components/bet-picker/bet-picker.wxss`
- Create: `miniprogram/components/bet-picker/bet-picker.json`

- [ ] **Step 1: 创建 bet-picker.json**

```json
{
  "component": true,
  "usingComponents": {}
}
```

- [ ] **Step 2: 创建 bet-picker.js**

```js
Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    score: {
      type: Number,
      value: 0
    },
    maxBet: {
      type: Number,
      value: null
    }
  },
  data: {
    quickAmounts: [5, 10, 20, 50, 100, 200],
    customAmount: ''
  },
  observers: {
    'visible'(val) {
      if (val) {
        this.setData({ customAmount: '' })
      }
    }
  },
  methods: {
    onQuickBet(e) {
      const amount = parseInt(e.currentTarget.dataset.amount)
      this.emitBet(amount)
    },
    onAllIn() {
      const amount = this.properties.score
      if (amount <= 0) {
        wx.showToast({ title: '积分不足', icon: 'none' })
        return
      }
      wx.showModal({
        title: 'ALL IN',
        content: `确定下注全部 ${amount} 分？`,
        confirmColor: '#d63031',
        success: (res) => {
          if (res.confirm) {
            this.emitBet(amount)
          }
        }
      })
    },
    onCustomInput(e) {
      this.setData({ customAmount: e.detail.value })
    },
    onCustomConfirm() {
      const amount = parseInt(this.data.customAmount)
      if (!amount || amount <= 0) {
        wx.showToast({ title: '请输入有效金额', icon: 'none' })
        return
      }
      this.emitBet(amount)
    },
    emitBet(amount) {
      if (amount > this.properties.score) {
        wx.showToast({ title: '积分不足', icon: 'none' })
        return
      }
      if (this.properties.maxBet && amount > this.properties.maxBet) {
        wx.showToast({ title: `单次上限 ${this.properties.maxBet}`, icon: 'none' })
        return
      }
      this.triggerEvent('bet', { amount })
    },
    onClose() {
      this.triggerEvent('close')
    }
  }
})
```

- [ ] **Step 3: 创建 bet-picker.wxml**

```xml
<view class="picker-overlay {{visible ? 'show' : ''}}" bindtap="onClose">
  <view class="picker-sheet" catchtap="">
    <view class="sheet-handle"></view>
    <view class="sheet-title">选择下注金额</view>
    <view class="quick-row">
      <view
        wx:for="{{quickAmounts}}"
        wx:key="*this"
        class="quick-btn"
        data-amount="{{item}}"
        bindtap="onQuickBet"
      >{{item}}</view>
    </view>
    <view class="quick-row">
      <view class="quick-btn all-in" bindtap="onAllIn">ALL IN</view>
    </view>
    <view class="custom-row">
      <input
        class="custom-input"
        type="number"
        placeholder="自定义金额"
        placeholder-style="color:#636e72"
        value="{{customAmount}}"
        bindinput="onCustomInput"
      />
      <view class="custom-confirm" bindtap="onCustomConfirm">确认</view>
    </view>
    <view class="score-hint">剩余积分：{{score}}</view>
  </view>
</view>
```

- [ ] **Step 4: 创建 bet-picker.wxss**

```css
.picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.6);
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s, visibility 0.2s;
}
.picker-overlay.show {
  opacity: 1;
  visibility: visible;
}
.picker-sheet {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #3d2015;
  border-radius: 16px 16px 0 0;
  padding: 16px;
}
.sheet-handle {
  width: 32px;
  height: 4px;
  background: #636e72;
  border-radius: 2px;
  margin: 0 auto 12px;
}
.sheet-title {
  color: #fab1a0;
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 12px;
  text-align: center;
}
.quick-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.quick-btn {
  flex: 1;
  background: #1a0e08;
  color: #dfe6e9;
  text-align: center;
  padding: 12px 0;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
}
.quick-btn.all-in {
  background: #d63031;
  color: #fff;
  flex: none;
  width: 100%;
}
.custom-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}
.custom-input {
  flex: 1;
  background: #1a0e08;
  border: 1px solid #e17055;
  color: #dfe6e9;
  padding: 12px 10px;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}
.custom-confirm {
  background: #e17055;
  color: #fff;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
}
.score-hint {
  text-align: center;
  color: #636e72;
  font-size: 12px;
}
```

---

## Phase 5: 页面

### Task 17: 首页 `pages/index/index`

**Files:**
- Create: `miniprogram/pages/index/index.js`
- Create: `miniprogram/pages/index/index.wxml`
- Create: `miniprogram/pages/index/index.wxss`
- Create: `miniprogram/pages/index/index.json`

- [ ] **Step 1: 创建 index.json**

```json
{
  "usingComponents": {},
  "navigationBarTitleText": "德州记分"
}
```

- [ ] **Step 2: 创建 index.js**

```js
const app = getApp()

Page({
  data: {
    roomId: '',
    userInfo: null
  },
  onLoad() {
    const userInfo = app.globalData.userInfo
    if (userInfo) {
      this.setData({ userInfo })
    }
  },
  onGetUserProfile() {
    wx.getUserProfile({
      desc: '用于在房间内显示',
      success: (res) => {
        app.globalData.userInfo = res.userInfo
        this.setData({ userInfo: res.userInfo })
      }
    })
  },
  onRoomIdInput(e) {
    this.setData({ roomId: e.detail.value })
  },
  onCreateRoom() {
    wx.cloud.callFunction({
      name: 'createRoom',
      data: {
        name: this.data.userInfo?.nickName || '玩家',
        avatar: this.data.userInfo?.avatarUrl || ''
      },
      success: (res) => {
        if (res.result.code === 0) {
          wx.navigateTo({
            url: `/pages/room/room?roomId=${res.result.roomId}`
          })
        } else {
          wx.showToast({ title: res.result.msg, icon: 'none' })
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },
  onJoinRoom() {
    const roomId = this.data.roomId.trim()
    if (!roomId || roomId.length !== 4) {
      wx.showToast({ title: '请输入4位房间号', icon: 'none' })
      return
    }
    wx.cloud.callFunction({
      name: 'joinRoom',
      data: {
        roomId,
        name: this.data.userInfo?.nickName || '玩家',
        avatar: this.data.userInfo?.avatarUrl || ''
      },
      success: (res) => {
        if (res.result.code === 0) {
          wx.navigateTo({
            url: `/pages/room/room?roomId=${roomId}`
          })
        } else {
          wx.showToast({ title: res.result.msg, icon: 'none' })
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  }
})
```

- [ ] **Step 3: 创建 index.wxml**

```xml
<view class="page">
  <view class="brand">
    <text class="brand-icon">🂡</text>
    <text class="brand-title">德州记分</text>
    <text class="brand-subtitle">线下德州扑克计分工具</text>
  </view>

  <view class="user-section" wx:if="{{!userInfo}}">
    <button class="profile-btn" open-type="getUserProfile" bindgetuserprofile="onGetUserProfile">
      获取头像昵称
    </button>
  </view>

  <view class="actions">
    <button class="btn btn-create" bindtap="onCreateRoom">
      创建房间
    </button>

    <view class="divider">
      <view class="divider-line"></view>
      <text class="divider-text">或</text>
      <view class="divider-line"></view>
    </view>

    <view class="join-box">
      <input
        class="join-input"
        type="number"
        maxlength="4"
        placeholder="输入4位房间号"
        placeholder-style="color:#636e72"
        value="{{roomId}}"
        bindinput="onRoomIdInput"
      />
      <button class="btn btn-join" bindtap="onJoinRoom" disabled="{{roomId.length !== 4}}">
        加入房间
      </button>
    </view>
  </view>
</view>
```

- [ ] **Step 4: 创建 index.wxss**

```css
.page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 40px 24px;
  box-sizing: border-box;
}
.brand {
  text-align: center;
  margin-bottom: 60px;
}
.brand-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 12px;
}
.brand-title {
  font-size: 32px;
  font-weight: 700;
  color: #ffeaa7;
  display: block;
}
.brand-subtitle {
  font-size: 14px;
  color: #636e72;
  margin-top: 8px;
  display: block;
}
.user-section {
  margin-bottom: 24px;
}
.profile-btn {
  background: transparent;
  border: 1px solid #e17055;
  color: #fab1a0;
  font-size: 13px;
  padding: 8px 20px;
  border-radius: 20px;
}
.actions {
  width: 100%;
  max-width: 300px;
}
.btn {
  width: 100%;
  padding: 14px 0;
  border-radius: 24px;
  font-size: 17px;
  font-weight: 700;
  text-align: center;
}
.btn-create {
  background: #e17055;
  color: #fff;
}
.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0;
}
.divider-line {
  flex: 1;
  height: 1px;
  background: #3d2015;
}
.divider-text {
  color: #636e72;
  font-size: 13px;
}
.join-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.join-input {
  background: #1a0e08;
  border: 1px solid #3d2015;
  color: #dfe6e9;
  padding: 14px;
  border-radius: 12px;
  font-size: 18px;
  text-align: center;
  letter-spacing: 8px;
}
.btn-join {
  background: #0984e3;
  color: #fff;
}
.btn-join[disabled] {
  background: #3d2015;
  color: #636e72;
}
```

### Task 18: 房间主界面 `pages/room/room`

**Files:**
- Create: `miniprogram/pages/room/room.js`
- Create: `miniprogram/pages/room/room.wxml`
- Create: `miniprogram/pages/room/room.wxss`
- Create: `miniprogram/pages/room/room.json`

- [ ] **Step 1: 创建 room.json**

```json
{
  "usingComponents": {
    "player-card": "/components/player-card/player-card",
    "bet-picker": "/components/bet-picker/bet-picker"
  },
  "navigationBarTitleText": "房间",
  "disableScroll": true
}
```

- [ ] **Step 2: 创建 room.js**

```js
const app = getApp()

Page({
  data: {
    roomId: '',
    game: null,
    selfPlayer: null,
    otherPlayers: [],
    pot: 0,
    logs: [],
    showPicker: false,
    showConfig: false,
    showMenu: false,
    showOwnerTransfer: false,
    isOwner: false,
    bettingDisabled: false,
    configForm: {
      initialChips: 1000,
      maxBetEnabled: false,
      maxBet: 100,
      exchangeRate: 1
    }
  },

  onLoad(options) {
    const roomId = options.roomId
    this.setData({ roomId })
    this.startWatch(roomId)
    this.monitorNetwork()
  },

  onUnload() {
    if (this._watcher) {
      this._watcher.close()
    }
    if (this._networkListener) {
      wx.offNetworkStatusChange(this._networkListener)
    }
  },

  startWatch(roomId) {
    const db = wx.cloud.database()
    this._watcher = db.collection('Game')
      .where({ roomId, status: 'playing' })
      .watch({
        onChange: (snapshot) => {
          if (snapshot.docs.length === 0) {
            wx.showToast({ title: '房间已解散', icon: 'none' })
            wx.navigateBack()
            return
          }
          const game = snapshot.docs[0]
          this.updateFromGame(game)
        },
        onError: (err) => {
          console.error('Watch error:', err)
        }
      })
  },

  updateFromGame(game) {
    const playerId = app.globalData.openid
    const selfPlayer = game.players.find(p => p.playerId === playerId)
    const otherPlayers = game.players.filter(p => p.playerId !== playerId)
    const isOwner = game.ownerId === playerId

    const logs = (game._logs || []).slice(-3)

    this.setData({
      game,
      selfPlayer: selfPlayer || null,
      otherPlayers,
      pot: game.pot,
      isOwner,
      logs
    })
  },

  onShowPicker() {
    this.setData({ showPicker: true })
  },
  onClosePicker() {
    this.setData({ showPicker: false })
  },
  onBet(e) {
    const { amount } = e.detail
    this.setData({ showPicker: false, bettingDisabled: true })

    const selfPlayer = this.data.selfPlayer
    const newScore = selfPlayer.score - amount
    const newBet = selfPlayer.currentBet + amount
    const newPot = this.data.pot + amount

    const updated = { ...selfPlayer, score: newScore, currentBet: newBet }
    this.applyOptimistic(updated, newPot)

    wx.cloud.callFunction({
      name: 'bet',
      data: { roomId: this.data.roomId, amount },
      success: (res) => {
        this.setData({ bettingDisabled: false })
        if (res.result.code !== 0) {
          this.applyOptimistic(selfPlayer, this.data.pot - amount)
          wx.showToast({ title: res.result.msg || '下注失败', icon: 'none' })
        }
      },
      fail: () => {
        this.setData({ bettingDisabled: false })
        this.applyOptimistic(selfPlayer, this.data.pot - amount)
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  onWin() {
    const pot = this.data.pot
    if (pot <= 0) {
      wx.showToast({ title: '总投注池为空', icon: 'none' })
      return
    }
    wx.showModal({
      title: '确认收池',
      content: `确定收下当前总投注池 ${pot} 分？`,
      confirmColor: '#0984e3',
      success: (modalRes) => {
        if (!modalRes.confirm) return

        this.setData({ bettingDisabled: true })
        const selfPlayer = this.data.selfPlayer
        const updated = { ...selfPlayer, score: selfPlayer.score + pot, currentBet: 0 }
        const resetOthers = this.data.otherPlayers.map(p => ({ ...p, currentBet: 0 }))
        this.applyOptimisticWin(updated, resetOthers)

        wx.cloud.callFunction({
          name: 'win',
          data: { roomId: this.data.roomId },
          success: (res) => {
            this.setData({ bettingDisabled: false })
            if (res.result.code !== 0) {
              wx.showToast({ title: res.result.msg || '收池失败', icon: 'none' })
            }
          },
          fail: () => {
            this.setData({ bettingDisabled: false })
            wx.showToast({ title: '网络错误', icon: 'none' })
          }
        })
      }
    })
  },

  applyOptimistic(updatedSelf, newPot) {
    const others = this.data.otherPlayers
    this.setData({
      selfPlayer: updatedSelf,
      pot: newPot
    })
  },

  applyOptimisticWin(updatedSelf, resetOthers) {
    this.setData({
      selfPlayer: updatedSelf,
      otherPlayers: resetOthers,
      pot: 0
    })
  },

  onToggleMenu() {
    this.setData({ showMenu: !this.data.showMenu })
  },
  onCloseMenu() {
    this.setData({ showMenu: false })
  },

  onNewGame() {
    wx.showModal({
      title: '新的一局',
      content: '确定重置所有玩家积分和投注？',
      confirmColor: '#e17055',
      success: (res) => {
        if (!res.confirm) return
        wx.cloud.callFunction({
          name: 'newGame',
          data: { roomId: this.data.roomId },
          success: (res) => {
            if (res.result.code !== 0) {
              wx.showToast({ title: res.result.msg, icon: 'none' })
            }
          }
        })
      }
    })
  },

  onConfig() {
    const cfg = this.data.game?.config || {}
    this.setData({
      showConfig: true,
      configForm: {
        initialChips: cfg.initialChips || 1000,
        maxBetEnabled: !!cfg.maxBet,
        maxBet: cfg.maxBet || 100,
        exchangeRate: cfg.exchangeRate || 1
      }
    })
  },
  onCloseConfig() {
    this.setData({ showConfig: false })
  },
  onConfigFieldChange(e) {
    const { field } = e.currentTarget.dataset
    const val = e.detail.value
    this.setData({ [`configForm.${field}`]: field === 'maxBetEnabled' ? e.detail.value : parseInt(val) || 0 })
  },
  onSaveConfig() {
    const form = this.data.configForm
    wx.cloud.callFunction({
      name: 'updateConfig',
      data: {
        roomId: this.data.roomId,
        config: {
          initialChips: form.initialChips,
          maxBet: form.maxBetEnabled ? form.maxBet : null,
          exchangeRate: form.exchangeRate
        }
      },
      success: (res) => {
        if (res.result.code === 0) {
          this.setData({ showConfig: false })
          wx.showToast({ title: '已保存', icon: 'success' })
        } else {
          wx.showToast({ title: res.result.msg, icon: 'none' })
        }
      },
      fail: () => {
        wx.showToast({ title: '保存失败', icon: 'none' })
      }
    })
  },

  onGoRules() {
    wx.navigateTo({ url: '/pages/rules/rules' })
  },
  onGoResult() {
    wx.navigateTo({ url: `/pages/result/result?roomId=${this.data.roomId}` })
  },
  onShareRoom() {
    // 微信分享由 onShareAppMessage 接管
  },

  onLeaveRoom() {
    const { isOwner, otherPlayers } = this.data
    if (isOwner && otherPlayers.length > 0) {
      this.setData({ showOwnerTransfer: true })
    } else {
      this.doLeave()
    }
  },

  onSelectNewOwner(e) {
    const newOwnerId = e.currentTarget.dataset.playerid
    wx.cloud.callFunction({
      name: 'transferOwnership',
      data: { roomId: this.data.roomId, newOwnerId },
      success: () => {
        this.setData({ showOwnerTransfer: false })
        this.doLeave()
      },
      fail: () => {
        wx.showToast({ title: '转让失败', icon: 'none' })
      }
    })
  },

  doLeave() {
    wx.cloud.callFunction({
      name: 'leaveRoom',
      data: { roomId: this.data.roomId },
      success: () => {
        wx.navigateBack()
      },
      fail: () => {
        wx.navigateBack()
      }
    })
  },

  onEditProfile() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        const avatar = res.tempFiles[0].tempFilePath
        wx.cloud.callFunction({
          name: 'updatePlayerProfile',
          data: { roomId: this.data.roomId, avatar },
          success: () => {
            wx.showToast({ title: '头像已更新', icon: 'success' })
          }
        })
      }
    })
  },

  monitorNetwork() {
    this._networkListener = (res) => {
      if (!res.isConnected) {
        wx.showToast({ title: '网络已断开', icon: 'none', duration: 2000 })
      }
    }
    wx.onNetworkStatusChange(this._networkListener)
  },

  onShareAppMessage() {
    return {
      title: `加入德州记分房间 ${this.data.roomId}`,
      path: `/pages/index/index?roomId=${this.data.roomId}`,
      imageUrl: ''
    }
  }
})
```

- [ ] **Step 3: 创建 room.wxml**

```xml
<view class="room-page">
  <!-- 顶部栏 -->
  <view class="top-bar">
    <view class="top-left" bindtap="onGoRules">
      <text class="room-icon">🂡</text>
      <text class="room-id">{{roomId}}</text>
    </view>
    <view class="top-right" bindtap="onToggleMenu">
      <text class="menu-icon">⋯</text>
    </view>
  </view>

  <!-- 信息栏 -->
  <view class="info-bar">
    <view class="pot-box">
      <text class="pot-label">💰 总投注池</text>
      <text class="pot-value">{{pot}}</text>
    </view>
    <view class="log-box">
      <text class="log-label">💬 日志</text>
      <scroll-view class="log-scroll" scroll-y>
        <text wx:for="{{logs}}" wx:key="*this" class="log-item">{{item}}</text>
        <text wx:if="{{logs.length === 0}}" class="log-empty">暂无操作</text>
      </scroll-view>
    </view>
  </view>

  <!-- 他人列表 -->
  <scroll-view class="player-list" scroll-y enhanced show-scrollbar="{{false}}">
    <player-card
      wx:for="{{otherPlayers}}"
      wx:key="playerId"
      player="{{item}}"
      isSelf="{{false}}"
    />
    <view wx:if="{{otherPlayers.length === 0}}" class="empty-hint">等待其他玩家加入...</view>
  </scroll-view>

  <!-- 我的操作区 -->
  <view class="self-area">
    <view class="self-info">
      <image class="self-avatar" src="{{selfPlayer.avatar || '/images/default-avatar.png'}}" mode="aspectFill" bindtap="onEditProfile"/>
      <view class="self-detail">
        <text class="self-name">{{selfPlayer.name || '我'}}</text>
        <text class="self-bet">投注: {{selfPlayer.currentBet || 0}}</text>
      </view>
      <text class="self-score">{{selfPlayer.score || 0}}</text>
    </view>
    <view class="self-buttons">
      <view class="btn btn-bet {{bettingDisabled ? 'disabled' : ''}}" bindtap="onShowPicker">🟢 出</view>
      <view class="btn btn-win {{bettingDisabled ? 'disabled' : ''}}" bindtap="onWin">🔵 收</view>
    </view>
  </view>

  <!-- 下注 Picker -->
  <bet-picker
    visible="{{showPicker}}"
    score="{{selfPlayer.score}}"
    maxBet="{{game.config.maxBet}}"
    bind:bet="onBet"
    bind:close="onClosePicker"
  />

  <!-- 右上菜单遮罩 -->
  <view class="menu-overlay {{showMenu ? 'show' : ''}}" bindtap="onCloseMenu">
    <view class="menu-sheet" catchtap="">
      <view class="menu-item" wx:if="{{isOwner}}" bindtap="onNewGame">🔄 新的一局</view>
      <view class="menu-item" wx:if="{{isOwner}}" bindtap="onConfig">⚙️ 筹码设置</view>
      <view class="menu-item" bindtap="onGoRules">🂡 牌型说明</view>
      <view class="menu-item" bindtap="onGoResult">💵 结算积分</view>
      <view class="menu-item" bindtap="onShareRoom">🔗 分享房间</view>
      <view class="menu-divider"></view>
      <view class="menu-item menu-danger" bindtap="onLeaveRoom">🚪 退出房间</view>
    </view>
  </view>

  <!-- 房主转让弹窗 -->
  <view class="menu-overlay {{showOwnerTransfer ? 'show' : ''}}">
    <view class="transfer-sheet">
      <text class="transfer-title">选择新房东</text>
      <view
        wx:for="{{otherPlayers}}"
        wx:key="playerId"
        class="transfer-player"
        data-playerid="{{item.playerId}}"
        bindtap="onSelectNewOwner"
      >
        <text>{{item.name}}</text>
      </view>
      <view class="transfer-cancel" bindtap="onLeaveRoom">不转让，直接退出</view>
    </view>
  </view>

  <!-- 筹码设置弹窗 -->
  <view class="menu-overlay {{showConfig ? 'show' : ''}}" bindtap="onCloseConfig">
    <view class="config-sheet" catchtap="">
      <text class="config-title">⚙️ 筹码设置</text>
      <view class="config-field">
        <text class="config-label">初始筹码</text>
        <input class="config-input" type="number" value="{{configForm.initialChips}}" data-field="initialChips" bindinput="onConfigFieldChange"/>
      </view>
      <view class="config-field">
        <text class="config-label">限制单次下注</text>
        <switch checked="{{configForm.maxBetEnabled}}" data-field="maxBetEnabled" bindchange="onConfigFieldChange" color="#e17055"/>
      </view>
      <view class="config-field" wx:if="{{configForm.maxBetEnabled}}">
        <text class="config-label">单次上限</text>
        <input class="config-input" type="number" value="{{configForm.maxBet}}" data-field="maxBet" bindinput="onConfigFieldChange"/>
      </view>
      <view class="config-field">
        <text class="config-label">1元 = X积分</text>
        <input class="config-input" type="number" value="{{configForm.exchangeRate}}" data-field="exchangeRate" bindinput="onConfigFieldChange"/>
      </view>
      <view class="btn config-save" bindtap="onSaveConfig">保存</view>
    </view>
  </view>
</view>
```

- [ ] **Step 4: 创建 room.wxss**

```css
.room-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #2c1810;
  overflow: hidden;
}

/* 顶部栏 */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  height: 44px;
  background: #1a0e08;
  border-bottom: 1px solid #3d2015;
  flex-shrink: 0;
}
.top-left {
  display: flex;
  align-items: center;
  gap: 6px;
}
.room-icon { font-size: 18px; }
.room-id {
  color: #fab1a0;
  font-weight: 700;
  font-size: 16px;
}
.menu-icon {
  color: #fab1a0;
  font-size: 24px;
  padding: 4px 8px;
}

/* 信息栏 */
.info-bar {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  background: #24140d;
  flex-shrink: 0;
}
.pot-box {
  flex: 1;
  background: #1a0e08;
  border-radius: 8px;
  padding: 8px;
  text-align: center;
}
.pot-label { color: #e17055; font-size: 10px; display: block; }
.pot-value { color: #ffeaa7; font-size: 24px; font-weight: 800; }
.log-box {
  flex: 1;
  background: #1a0e08;
  border-radius: 8px;
  padding: 8px;
  overflow: hidden;
}
.log-label { color: #e17055; font-size: 10px; }
.log-scroll { height: 36px; }
.log-item { color: #dfe6e9; font-size: 11px; display: block; white-space: nowrap; }
.log-empty { color: #636e72; font-size: 11px; }

/* 玩家列表 */
.player-list {
  flex: 1;
  padding: 0 12px;
  overflow-y: auto;
}
.empty-hint {
  text-align: center;
  color: #636e72;
  padding: 40px 0;
}

/* 我的操作区 */
.self-area {
  background: #1a0e08;
  border-top: 2px solid #e17055;
  padding: 10px 16px;
  flex-shrink: 0;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
}
.self-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.self-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid #ffeaa7;
  background: #3d2015;
}
.self-detail {
  flex: 1;
}
.self-name {
  color: #ffeaa7;
  font-size: 14px;
  font-weight: 700;
}
.self-bet {
  color: #fab1a0;
  font-size: 11px;
  margin-left: 6px;
}
.self-score {
  color: #ffeaa7;
  font-size: 18px;
  font-weight: 800;
}
.self-buttons {
  display: flex;
  gap: 10px;
}
.btn {
  flex: 1;
  text-align: center;
  padding: 14px 0;
  border-radius: 24px;
  font-size: 17px;
  font-weight: 700;
}
.btn-bet { background: #00b894; color: #fff; }
.btn-win { background: #0984e3; color: #fff; }
.btn.disabled { opacity: 0.4; }

/* 菜单 */
.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.6);
  z-index: 200;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s, visibility 0.2s;
}
.menu-overlay.show {
  opacity: 1;
  visibility: visible;
}
.menu-sheet {
  position: absolute;
  top: 44px;
  right: 8px;
  background: #3d2015;
  border-radius: 12px;
  padding: 8px 0;
  min-width: 160px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}
.menu-item {
  padding: 12px 20px;
  color: #dfe6e9;
  font-size: 14px;
}
.menu-item:active { background: #2c1810; }
.menu-divider {
  height: 1px;
  background: #2c1810;
  margin: 4px 0;
}
.menu-danger { color: #d63031; }

/* 转让弹窗 */
.transfer-sheet {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #3d2015;
  border-radius: 16px;
  padding: 24px;
  min-width: 240px;
}
.transfer-title {
  color: #ffeaa7;
  font-size: 16px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 16px;
  display: block;
}
.transfer-player {
  padding: 12px;
  color: #dfe6e9;
  font-size: 14px;
  text-align: center;
  background: #1a0e08;
  border-radius: 8px;
  margin-bottom: 8px;
}
.transfer-player:active { background: #2c1810; }
.transfer-cancel {
  padding: 12px;
  color: #636e72;
  font-size: 13px;
  text-align: center;
}

/* 设置弹窗 */
.config-sheet {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #3d2015;
  border-radius: 16px 16px 0 0;
  padding: 24px 20px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}
.config-title {
  color: #ffeaa7;
  font-size: 16px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 20px;
  display: block;
}
.config-field {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.config-label {
  color: #dfe6e9;
  font-size: 14px;
}
.config-input {
  background: #1a0e08;
  border: 1px solid #e17055;
  color: #dfe6e9;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  width: 100px;
  text-align: center;
}
.config-save {
  width: 100%;
  background: #e17055;
  color: #fff;
  padding: 14px 0;
  border-radius: 24px;
  margin-top: 8px;
}
```

### Task 19: 结算页面 `pages/result/result`

**Files:**
- Create: `miniprogram/pages/result/result.js`
- Create: `miniprogram/pages/result/result.wxml`
- Create: `miniprogram/pages/result/result.wxss`
- Create: `miniprogram/pages/result/result.json`

- [ ] **Step 1: 创建 result.json**

```json
{
  "usingComponents": {},
  "navigationBarTitleText": "结算积分"
}
```

- [ ] **Step 2: 创建 result.js**

```js
const app = getApp()

Page({
  data: {
    roomId: '',
    result: null,
    config: null,
    isOwner: false,
    myTransfers: [],
    toPay: 0,
    toReceive: 0,
    net: 0,
    netYuan: 0
  },

  onLoad(options) {
    const roomId = options.roomId
    this.setData({ roomId })
    this.loadSettle()
  },

  loadSettle() {
    wx.cloud.callFunction({
      name: 'settle',
      data: { roomId: this.data.roomId },
      success: (res) => {
        if (res.result.code === 0) {
          const { result, config } = res.result
          this.computePersonal(result)
          this.setData({ result, config })
          this.checkOwnership()
        } else {
          wx.showToast({ title: res.result.msg, icon: 'none' })
        }
      },
      fail: () => {
        wx.showToast({ title: '加载失败', icon: 'none' })
      }
    })
  },

  checkOwnership() {
    const db = wx.cloud.database()
    db.collection('Game').where({ roomId: this.data.roomId }).get().then(res => {
      if (res.data.length > 0) {
        const game = res.data[0]
        this.setData({ isOwner: game.ownerId === app.globalData.openid })
      }
    })
  },

  computePersonal(result) {
    const openid = app.globalData.openid
    const myTransfers = result.transfers.filter(
      t => t.fromId === openid || t.toId === openid
    )
    let toPay = 0, toReceive = 0
    myTransfers.forEach(t => {
      if (t.fromId === openid) toPay += t.amount
      if (t.toId === openid) toReceive += t.amount
    })
    const detail = result.playerDetails.find(p => p.playerId === openid)
    this.setData({
      myTransfers,
      toPay: Math.round(toPay * 100) / 100,
      toReceive: Math.round(toReceive * 100) / 100,
      net: detail?.net || 0,
      netYuan: detail?.netYuan || 0
    })
  },

  onSettle() {
    wx.showModal({
      title: '确认结算',
      content: '结算后结果将被保存，确定？',
      confirmColor: '#e17055',
      success: (res) => {
        if (res.confirm) {
          this.loadSettle()
        }
      }
    })
  }
})
```

- [ ] **Step 3: 创建 result.wxml**

```xml
<view class="page">
  <!-- 个人视图 -->
  <view class="personal-cards">
    <view class="card card-pay">
      <text class="card-label">你需要支付</text>
      <text class="card-value">{{toPay}}</text>
      <text class="card-unit">元</text>
    </view>
    <view class="card card-receive">
      <text class="card-label">你将收到</text>
      <text class="card-value">{{toReceive}}</text>
      <text class="card-unit">元</text>
    </view>
  </view>

  <view class="net-result {{net >= 0 ? 'positive' : 'negative'}}">
    <text class="net-label">净盈亏</text>
    <text class="net-value">{{net >= 0 ? '+' : ''}}{{net}} 分（{{netYuan >= 0 ? '+' : ''}}{{netYuan}}元）</text>
  </view>

  <!-- 全局转账清单 -->
  <view class="section" wx:if="{{result.transfers.length > 0}}">
    <text class="section-title">转账清单（{{result.transfers.length}}笔，最优）</text>
    <view class="transfer-list">
      <view class="transfer-item" wx:for="{{result.transfers}}" wx:key="*this">
        <text class="transfer-from">{{item.from}}</text>
        <text class="transfer-arrow">→</text>
        <text class="transfer-to">{{item.to}}</text>
        <text class="transfer-amount">{{item.amount}}元</text>
      </view>
    </view>
  </view>
  <view class="section" wx:else>
    <text class="section-title">所有玩家盈亏一致，无需转账</text>
  </view>

  <!-- 盈亏明细 -->
  <view class="section">
    <text class="section-title">盈亏明细</text>
    <view class="detail-table">
      <view class="detail-header">
        <text>玩家</text>
        <text>盈亏</text>
        <text>应付/应收</text>
      </view>
      <view class="detail-row" wx:for="{{result.playerDetails}}" wx:key="playerId">
        <text>{{item.name}}</text>
        <text class="{{item.net >= 0 ? 'positive' : 'negative'}}">{{item.net >= 0 ? '+' : ''}}{{item.net}}</text>
        <text class="{{item.net >= 0 ? 'positive' : 'negative'}}">{{item.netYuan >= 0 ? '收' : '付'}}{{item.netYuan >= 0 ? item.netYuan : -item.netYuan}}元</text>
      </view>
    </view>
  </view>

  <view class="settle-btn" wx:if="{{isOwner}}" bindtap="onSettle">💵 重新结算</view>
</view>
```

- [ ] **Step 4: 创建 result.wxss**

```css
.page {
  min-height: 100vh;
  background: #2c1810;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
}
.personal-cards {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
.card {
  flex: 1;
  background: #1a0e08;
  border-radius: 10px;
  padding: 16px;
  text-align: center;
}
.card-pay { border-left: 3px solid #d63031; }
.card-receive { border-left: 3px solid #00b894; }
.card-label { color: #636e72; font-size: 11px; display: block; }
.card-value { font-size: 26px; font-weight: 800; display: block; margin: 4px 0; }
.card-pay .card-value { color: #d63031; }
.card-receive .card-value { color: #00b894; }
.card-unit { color: #636e72; font-size: 12px; }
.net-result {
  text-align: center;
  padding: 14px;
  background: #1a0e08;
  border-radius: 10px;
  margin-bottom: 16px;
}
.net-label { color: #636e72; font-size: 11px; }
.net-value { font-size: 20px; font-weight: 800; display: block; margin-top: 2px; }
.net-result.positive .net-value { color: #00b894; }
.net-result.negative .net-value { color: #d63031; }
.section { margin-bottom: 16px; }
.section-title {
  color: #fab1a0;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
  display: block;
}
.transfer-list {
  background: #1a0e08;
  border-radius: 10px;
  padding: 8px 14px;
}
.transfer-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 0;
  border-bottom: 1px solid #3d2015;
  font-size: 13px;
}
.transfer-item:last-child { border-bottom: none; }
.transfer-from, .transfer-to { color: #dfe6e9; }
.transfer-arrow { color: #636e72; }
.transfer-amount { color: #e17055; font-weight: 700; margin-left: auto; }
.detail-table {
  background: #1a0e08;
  border-radius: 10px;
  padding: 8px 14px;
}
.detail-header {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px solid #3d2015;
  font-size: 11px;
  color: #636e72;
}
.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
  color: #dfe6e9;
}
.positive { color: #00b894; }
.negative { color: #d63031; }
.settle-btn {
  width: 100%;
  background: #e17055;
  color: #fff;
  text-align: center;
  padding: 14px 0;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 700;
  margin-top: 8px;
}
```

### Task 20: 牌型说明 `pages/rules/rules`

**Files:**
- Create: `miniprogram/pages/rules/rules.js`
- Create: `miniprogram/pages/rules/rules.wxml`
- Create: `miniprogram/pages/rules/rules.wxss`
- Create: `miniprogram/pages/rules/rules.json`

- [ ] **Step 1: 创建 rules.json**

```json
{
  "usingComponents": {},
  "navigationBarTitleText": "牌型说明"
}
```

- [ ] **Step 2: 创建 rules.js**

```js
Page({
  data: {
    hands: [
      { name: '皇家同花顺', icon: '🂡🂮🂫🂨🂥', desc: '同花色的 A-K-Q-J-10，最大牌型' },
      { name: '同花顺', icon: '🂩🂨🂧🂦🂥', desc: '同花色连续五张牌' },
      { name: '四条', icon: '🂡🂱🂡🂱🂥', desc: '四张相同点数的牌' },
      { name: '葫芦', icon: '🂡🂱🂡🂩🂩', desc: '三条 + 一对' },
      { name: '同花', icon: '🂡🂥🂩🂭🂱', desc: '五张同花色的牌（不连续）' },
      { name: '顺子', icon: '🂡🂢🂣🂤🂥', desc: '五张连续点数的牌（不同花色）' },
      { name: '三条', icon: '🂡🂱🂱🂥🂦', desc: '三张相同点数的牌' },
      { name: '两对', icon: '🂡🂱🂩🂩🂥', desc: '两个对子' },
      { name: '一对', icon: '🂡🂱🂥🂦🂧', desc: '两张相同点数的牌' },
      { name: '高牌', icon: '🂡🂥🂧🂩🂫', desc: '无任何组合，比最大单张' }
    ]
  }
})
```

- [ ] **Step 3: 创建 rules.wxml**

```xml
<view class="page">
  <view class="card" wx:for="{{hands}}" wx:key="name">
    <text class="hand-icon">{{item.icon}}</text>
    <view class="hand-info">
      <text class="hand-name">{{item.name}}</text>
      <text class="hand-desc">{{item.desc}}</text>
    </view>
    <text class="hand-rank">#{{index + 1}}</text>
  </view>
</view>
```

- [ ] **Step 4: 创建 rules.wxss**

```css
.page {
  min-height: 100vh;
  background: #2c1810;
  padding: 12px;
}
.card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #1a0e08;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 8px;
}
.hand-icon {
  font-size: 28px;
  flex-shrink: 0;
}
.hand-info { flex: 1; }
.hand-name {
  color: #ffeaa7;
  font-size: 15px;
  font-weight: 700;
  display: block;
}
.hand-desc {
  color: #636e72;
  font-size: 12px;
  margin-top: 2px;
  display: block;
}
.hand-rank {
  color: #e17055;
  font-size: 18px;
  font-weight: 700;
}
```

---

## Phase 6: 静态资源与收尾

### Task 21: 默认头像占位图

**Files:**
- Create: `miniprogram/images/default-avatar.png`

- [ ] **Step 1: 创建占位 SVG（转换为 PNG 需在微信开发者工具中完成）**

在实际开发中，使用微信开发者工具的资源管理器，在 `images/` 目录添加一张 120×120 的默认头像 PNG 图片。或者使用一个圆形纯色占位替代：在 wxml 中使用条件渲染 `<image>` 时，设置默认背景样式。

作为替代方案，修改所有引用 `default-avatar.png` 的地方使用内联 fallback。

### Task 22: 云函数部署

- [ ] **Step 1: 在微信开发者工具中，右键每个云函数目录 → 上传并部署：云端安装依赖**

云函数清单（按部署顺序）：
1. `createRoom`
2. `joinRoom`
3. `bet`
4. `win`
5. `newGame`
6. `updateConfig`
7. `updatePlayerProfile`
8. `leaveRoom`
9. `transferOwnership`
10. `settle`

- [ ] **Step 2: 在云开发控制台创建 `Game` 和 `Record` 数据库集合**

- [ ] **Step 3: Game 集合设置权限**：所有用户可读，仅创建者可写（或使用云函数操作）
- [ ] **Step 4: Record 集合设置权限**：所有用户可读，仅创建者可写

### Task 23: 获取 openid

修改 `app.js` 在启动时获取 openid：

```js
App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: 'your-cloud-env-id',
        traceUser: true
      })
      wx.cloud.callFunction({
        name: 'login',
        success: (res) => {
          this.globalData.openid = res.result.openid
        }
      })
    }
  },
  globalData: {
    userInfo: null,
    openid: null
  }
})
```

需要创建一个简单的 `login` 云函数：

**Files:**
- Create: `miniprogram/cloudfunctions/login/index.js`
- Create: `miniprogram/cloudfunctions/login/package.json`

```js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  return { openid: wxContext.OPENID }
}
```

### Task 24: 首页支持从分享链接直接加入

修改 `pages/index/index.js` 的 `onLoad`：

```js
onLoad(options) {
  const userInfo = app.globalData.userInfo
  if (userInfo) {
    this.setData({ userInfo })
  }
  if (options.roomId) {
    this.setData({ roomId: options.roomId })
    this.onJoinRoom()
  }
}
```

---

## 执行顺序建议

| 阶段 | Task | 产出 | 可并行 |
|------|------|------|--------|
| 脚手架 | 1-3 | 项目配置文件 | — |
| 工具 | 4 | settle.js | 与 Task 1-3 并行 |
| 云函数 | 5-14 | 10 个云函数 | 互相之间可并行 |
| 组件 | 15-16 | 2 个组件 | 与云函数并行 |
| 页面 | 17-20 | 4 个页面 | 可与云函数并行 |
| 收尾 | 21-24 | 图片/部署/login云函数/分享 | 在页面完成后 |

**推荐交付批次**：
1. Task 1-4 → 脚手架 + 工具模块，微信开发者工具中可打开项目
2. Task 5-8 → 核心云函数（createRoom/joinRoom/bet/win），可测试创建房间和下注流程
3. Task 9-14 → 剩余云函数（newGame/updateConfig/leaveRoom/transferOwnership/settle/updatePlayerProfile）
4. Task 15-16 → 组件（player-card/bet-picker）
5. Task 17 → 首页，可创建/加入房间
6. Task 18 → 房间主界面，核心功能可用
7. Task 19-20 → 结算页 + 牌型说明
8. Task 21-24 → 收尾、部署、集成测试
