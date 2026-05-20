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
