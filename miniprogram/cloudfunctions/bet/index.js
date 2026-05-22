const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const playerId = wxContext.OPENID
  const { roomId, amount } = event

  if (!amount || amount <= 0) {
    return { code: -1, msg: '下注积分无效' }
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
