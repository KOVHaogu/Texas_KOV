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
