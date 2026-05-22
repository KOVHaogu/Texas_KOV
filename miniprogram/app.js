var config = require('./config.js')

App({
  onLaunch() {
    this._coldLaunch = true
    if (wx.cloud) {
      wx.cloud.init({
        env: config.envId,
        traceUser: true
      })
      wx.cloud.callFunction({
        name: 'login',
        success: (res) => {
          this.globalData.openid = res.result.openid
        },
        fail: (err) => {
          console.warn('login cloud function failed, retrying...', err)
          wx.cloud.callFunction({
            name: 'login',
            success: (retryRes) => {
              this.globalData.openid = retryRes.result.openid
            },
            fail: () => {
              console.warn('login retry also failed')
            }
          })
        }
      })
    }
  },
  globalData: {
    userInfo: null,
    openid: null
  }
})
