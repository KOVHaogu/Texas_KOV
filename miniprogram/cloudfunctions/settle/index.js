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
