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
    wx.cloud.callFunction({
      name: 'createRoom',
      data: {
        name: this.data.nickname || '玩家',
        avatar: this.data.avatar || ''
      },
      success: (res) => {
        if (res.result.code === 0) {
          wx.navigateTo({
            url: `/pages/room/room?roomId=${res.result.roomId}`
          })
        } else {
          wx.showToast({ title: res.result.msg, icon: 'none' })
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },
  onJoinRoom() {
    const roomId = this.data.roomId.trim()
    if (!roomId || roomId.length !== 4) {
      wx.showToast({ title: '请输入4位房间号', icon: 'none' })
      return
    }
    wx.cloud.callFunction({
      name: 'joinRoom',
      data: {
        roomId,
        name: this.data.nickname || '玩家',
        avatar: this.data.avatar || ''
      },
      success: (res) => {
        if (res.result.code === 0) {
          wx.navigateTo({
            url: `/pages/room/room?roomId=${roomId}`
          })
        } else {
          wx.showToast({ title: res.result.msg, icon: 'none' })
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  }
})
