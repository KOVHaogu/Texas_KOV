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
