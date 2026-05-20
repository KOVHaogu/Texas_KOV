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
