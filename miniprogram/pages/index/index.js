const app = getApp()

Page({
  data: {
    roomId: '',
    avatar: '',
    nickname: ''
  },
  onLoad(options) {
    const userInfo = app.globalData.userInfo
    if (userInfo) {
      this.setData({ avatar: userInfo.avatarUrl || '', nickname: userInfo.nickName || '' })
    }
    if (options.roomId) {
      this.setData({ roomId: options.roomId })
      this.onJoinRoom()
      return
    }
    const activeRoomId = wx.getStorageSync('activeRoomId')
    if (activeRoomId && app._coldLaunch) {
      app._coldLaunch = false
      wx.redirectTo({ url: `/pages/room/room?roomId=${activeRoomId}` })
    }
  },
  onChooseAvatar(e) {
    const avatar = e.detail.avatarUrl
    this.setData({ avatar })
    this.saveProfile(avatar, this.data.nickname)
  },
  onNicknameInput(e) {
    const nickname = e.detail.value
    this.setData({ nickname })
    this.saveProfile(this.data.avatar, nickname)
  },
  saveProfile(avatar, nickname) {
    app.globalData.userInfo = { avatarUrl: avatar, nickName: nickname }
  },
  onRoomIdInput(e) {
    this.setData({ roomId: e.detail.value })
  },
  onCreateRoom() {
    if (this._locked) return
    this._locked = true
    wx.showLoading({ title: '创建中...', mask: true })
    wx.cloud.callFunction({
      name: 'createRoom',
      data: {
        name: this.data.nickname || '玩家',
        avatar: this.data.avatar || ''
      },
      success: (res) => {
        wx.hideLoading()
        if (res.result.code === 0) {
          wx.setStorageSync('activeRoomId', res.result.roomId)
          wx.redirectTo({
            url: `/pages/room/room?roomId=${res.result.roomId}`
          })
        } else {
          this._locked = false
          wx.showToast({ title: res.result.msg, icon: 'none' })
        }
      },
      fail: () => {
        wx.hideLoading()
        this._locked = false
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },
  onJoinRoom() {
    if (this._locked) return
    const roomId = this.data.roomId.trim()
    if (!roomId || roomId.length !== 4) {
      wx.showToast({ title: '请输入4位房间号', icon: 'none' })
      return
    }
    this._locked = true
    wx.showLoading({ title: '加入中...', mask: true })
    wx.cloud.callFunction({
      name: 'joinRoom',
      data: {
        roomId,
        name: this.data.nickname || '玩家',
        avatar: this.data.avatar || ''
      },
      success: (res) => {
        wx.hideLoading()
        if (res.result.code === 0) {
          wx.setStorageSync('activeRoomId', roomId)
          wx.redirectTo({
            url: `/pages/room/room?roomId=${roomId}`
          })
        } else {
          this._locked = false
          wx.showToast({ title: res.result.msg, icon: 'none' })
        }
      },
      fail: () => {
        wx.hideLoading()
        this._locked = false
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  }
})
