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
