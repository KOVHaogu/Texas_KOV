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
