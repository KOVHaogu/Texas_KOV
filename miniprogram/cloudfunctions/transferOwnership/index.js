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
