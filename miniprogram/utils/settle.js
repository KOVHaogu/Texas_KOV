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
