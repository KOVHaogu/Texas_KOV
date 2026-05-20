const app = getApp()

Page({
  data: {
    roomId: '',
    selfPlayer: null,
    otherPlayers: [],
    pot: 0,
    maxBet: 0,
    logs: [],
    allLogs: [],
    showPicker: false,
    showConfig: false,
    showMenu: false,
    showOwnerTransfer: false,
    showLogModal: false,
    isOwner: false,
    bettingDisabled: false,
    configForm: {
      initialChips: 1000,
      maxBetEnabled: false,
      maxBet: 100,
      exchangeRate: 1
    }
  },

  onLoad(options) {
    const roomId = options.roomId
    this.setData({ roomId })
    this.startWatch(roomId)
    this.monitorNetwork()
  },

  onUnload() {
    if (this._watcher) {
      this._watcher.close()
    }
    if (this._networkListener) {
      wx.offNetworkStatusChange(this._networkListener)
    }
  },

  startWatch(roomId) {
    const db = wx.cloud.database()
    this._watcher = db.collection('Game')
      .where({ roomId, status: 'playing' })
      .watch({
        onChange: (snapshot) => {
          if (snapshot.docs.length === 0) {
            wx.showToast({ title: '房间已解散', icon: 'none' })
            wx.navigateBack()
            return
          }
          const game = snapshot.docs[0]
          this.updateFromGame(game)
          if (!this._logsLoaded) {
            this._logsLoaded = true
            this.fetchLogs(game.roomId)
          }
        },
        onError: (err) => {
          console.error('Watch error:', err)
        }
      })
  },

  updateFromGame(game) {
    const playerId = app.globalData.openid
    const selfPlayer = game.players.find(p => p.playerId === playerId)
    const otherPlayers = game.players.filter(p => p.playerId !== playerId)
    const isOwner = game.ownerId === playerId
    this._game = game

    this.setData({
      selfPlayer: selfPlayer || null,
      otherPlayers,
      pot: game.pot,
      maxBet: game.config.maxBet || 0,
      isOwner
    })
  },

  fetchLogs(roomId, limit) {
    const db = wx.cloud.database()
    const query = db.collection('Record')
      .where({ roomId })
      .orderBy('timestamp', 'desc')
    const q = limit ? query.limit(limit) : query
    q.get()
      .then(res => {
        const format = r => {
          const t = new Date(r.timestamp)
          const time = `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`
          if (r.action === 'bet') return `${time} ${r.playerName} 出${r.amount}`
          if (r.action === 'win') return `${time} ${r.playerName} 收${r.amount}`
          if (r.action === 'join') return `${time} ${r.playerName} 加入`
          if (r.action === 'leave') return `${time} ${r.playerName} 退出`
          if (r.action === 'new_game') return `${time} 新的一局`
          if (r.action === 'settings_change') return `${time} 修改了设置`
          return ''
        }
        const logs = res.data.map(format).filter(Boolean)
        this.setData({ logs: logs.slice(0, 3), allLogs: logs })
      })
      .catch(() => {})
  },

  onShowLogModal() {
    this.fetchLogs(this.data.roomId, 0)
    this.setData({ showLogModal: true })
  },
  onCloseLogModal() {
    this.setData({ showLogModal: false })
  },

  onShowPicker() {
    this.setData({ showPicker: true })
  },
  onClosePicker() {
    this.setData({ showPicker: false })
  },

  onBet(e) {
    const { amount } = e.detail
    this.setData({ showPicker: false, bettingDisabled: true })
    setTimeout(() => { this.setData({ bettingDisabled: false }) }, 400)

    wx.cloud.callFunction({
      name: 'bet',
      data: { roomId: this.data.roomId, amount },
      success: (res) => {
        if (res.result.code !== 0) {
          wx.showToast({ title: res.result.msg || '下注失败', icon: 'none' })
        } else {
          setTimeout(() => { this.fetchLogs(this.data.roomId) }, 300)
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  onWin() {
    const pot = this.data.pot
    if (pot <= 0) {
      wx.showToast({ title: '总投注池为空', icon: 'none' })
      return
    }
    wx.showModal({
      title: '确认收池',
      content: `确定收下当前总投注池 ${pot} 分？`,
      confirmColor: '#0984e3',
      success: (modalRes) => {
        if (!modalRes.confirm) return

        this.setData({ bettingDisabled: true })
        setTimeout(() => { this.setData({ bettingDisabled: false }) }, 400)

        wx.cloud.callFunction({
          name: 'win',
          data: { roomId: this.data.roomId },
          success: (res) => {
            if (res.result.code !== 0) {
              wx.showToast({ title: res.result.msg || '收池失败', icon: 'none' })
            } else {
              setTimeout(() => { this.fetchLogs(this.data.roomId) }, 300)
            }
          },
          fail: () => {
            wx.showToast({ title: '网络错误', icon: 'none' })
          }
        })
      }
    })
  },

  onNoop() {},
  onToggleMenu() {
    this.setData({ showMenu: !this.data.showMenu })
  },
  onCloseMenu() {
    this.setData({ showMenu: false })
  },

  onNewGame() {
    wx.showModal({
      title: '新的一局',
      content: '确定重置所有玩家积分和投注？',
      confirmColor: '#e17055',
      success: (res) => {
        if (!res.confirm) return
        wx.cloud.callFunction({
          name: 'newGame',
          data: { roomId: this.data.roomId },
          success: (res) => {
            if (res.result.code !== 0) {
              wx.showToast({ title: res.result.msg, icon: 'none' })
            } else {
              setTimeout(() => { this.fetchLogs(this.data.roomId) }, 300)
            }
          }
        })
      }
    })
  },

  onConfig() {
    const cfg = this._game?.config || {}
    this.setData({
      showConfig: true,
      configForm: {
        initialChips: cfg.initialChips || 1000,
        maxBetEnabled: !!cfg.maxBet,
        maxBet: cfg.maxBet || 100,
        exchangeRate: cfg.exchangeRate || 1
      }
    })
  },
  onCloseConfig() {
    this.setData({ showConfig: false })
  },
  onConfigSwitchChange(e) {
    this.setData({ 'configForm.maxBetEnabled': e.detail.value })
  },
  onConfigIntFieldChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`configForm.${field}`]: parseInt(e.detail.value) || 0 })
  },
  onConfigFieldChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`configForm.${field}`]: parseInt(e.detail.value) || 0 })
  },
  onSaveConfig() {
    const form = this.data.configForm
    wx.cloud.callFunction({
      name: 'updateConfig',
      data: {
        roomId: this.data.roomId,
        config: {
          initialChips: form.initialChips,
          maxBet: form.maxBetEnabled ? form.maxBet : null,
          exchangeRate: form.exchangeRate
        }
      },
      success: (res) => {
        if (res.result.code === 0) {
          this.setData({ showConfig: false })
          wx.showToast({ title: '已保存', icon: 'success' })
        } else {
          wx.showToast({ title: res.result.msg, icon: 'none' })
        }
      },
      fail: () => {
        wx.showToast({ title: '保存失败', icon: 'none' })
      }
    })
  },

  onGoRules() {
    wx.navigateTo({ url: '/pages/rules/rules' })
  },
  onGoResult() {
    wx.navigateTo({ url: `/pages/result/result?roomId=${this.data.roomId}` })
  },
  onShareRoom() {},

  onLeaveRoom() {
    const { isOwner, otherPlayers } = this.data
    if (isOwner && otherPlayers.length > 0) {
      this.setData({ showOwnerTransfer: true })
    } else {
      this.doLeave()
    }
  },

  onSelectNewOwner(e) {
    const newOwnerId = e.currentTarget.dataset.playerid
    wx.cloud.callFunction({
      name: 'transferOwnership',
      data: { roomId: this.data.roomId, newOwnerId },
      success: () => {
        this.setData({ showOwnerTransfer: false })
        this.doLeave()
      },
      fail: () => {
        wx.showToast({ title: '转让失败', icon: 'none' })
      }
    })
  },

  doLeave() {
    wx.cloud.callFunction({
      name: 'leaveRoom',
      data: { roomId: this.data.roomId },
      success: () => {
        wx.navigateBack()
      },
      fail: () => {
        wx.navigateBack()
      }
    })
  },

  onEditProfile() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        const avatar = res.tempFiles[0].tempFilePath
        wx.cloud.callFunction({
          name: 'updatePlayerProfile',
          data: { roomId: this.data.roomId, avatar },
          success: () => {
            wx.showToast({ title: '头像已更新', icon: 'success' })
          }
        })
      }
    })
  },

  onEditNickname() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '输入新昵称',
      content: this.data.selfPlayer?.name || '',
      success: (res) => {
        if (res.confirm && res.content) {
          const name = res.content.trim()
          wx.cloud.callFunction({
            name: 'updatePlayerProfile',
            data: { roomId: this.data.roomId, name },
            success: () => {
              wx.showToast({ title: '昵称已更新', icon: 'success' })
            }
          })
        }
      }
    })
  },

  monitorNetwork() {
    this._networkListener = (res) => {
      if (!res.isConnected) {
        wx.showToast({ title: '网络已断开', icon: 'none', duration: 2000 })
      }
    }
    wx.onNetworkStatusChange(this._networkListener)
  },

  onShareAppMessage() {
    return {
      title: `加入KOV智能计分器房间 ${this.data.roomId}`,
      path: `/pages/index/index?roomId=${this.data.roomId}`,
      imageUrl: ''
    }
  }
})
