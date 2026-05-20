const app = getApp()

Page({
  data: {
    roomId: '',
    result: null,
    config: null,
    isOwner: false,
    myTransfers: [],
    toPay: 0,
    toReceive: 0,
    net: 0,
    netYuan: 0
  },

  onLoad(options) {
    const roomId = options.roomId
    this.setData({ roomId })
    this.loadSettle()
  },

  loadSettle() {
    wx.cloud.callFunction({
      name: 'settle',
      data: { roomId: this.data.roomId },
      success: (res) => {
        if (res.result.code === 0) {
          const { result, config } = res.result
          this.computePersonal(result)
          this.setData({ result, config })
          this.checkOwnership()
        } else {
          wx.showToast({ title: res.result.msg, icon: 'none' })
        }
      },
      fail: () => {
        wx.showToast({ title: '加载失败', icon: 'none' })
      }
    })
  },

  checkOwnership() {
    const db = wx.cloud.database()
    db.collection('Game').where({ roomId: this.data.roomId }).get().then(res => {
      if (res.data.length > 0) {
        const game = res.data[0]
        this.setData({ isOwner: game.ownerId === app.globalData.openid })
      }
    })
  },

  computePersonal(result) {
    const openid = app.globalData.openid
    const myTransfers = result.transfers.filter(
      t => t.fromId === openid || t.toId === openid
    )
    let toPay = 0, toReceive = 0
    myTransfers.forEach(t => {
      if (t.fromId === openid) toPay += t.amount
      if (t.toId === openid) toReceive += t.amount
    })
    const detail = result.playerDetails.find(p => p.playerId === openid)
    this.setData({
      myTransfers,
      toPay: Math.round(toPay * 100) / 100,
      toReceive: Math.round(toReceive * 100) / 100,
      net: detail?.net || 0,
      netYuan: detail?.netYuan || 0
    })
  },

  onSettle() {
    wx.showModal({
      title: '确认结算',
      content: '结算后结果将被保存，确定？',
      confirmColor: '#e17055',
      success: (res) => {
        if (res.confirm) {
          this.loadSettle()
        }
      }
    })
  }
})
