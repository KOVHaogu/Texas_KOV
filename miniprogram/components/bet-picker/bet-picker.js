Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    score: {
      type: Number,
      value: 0
    },
    maxBet: {
      type: Number,
      value: null
    }
  },
  data: {
    quickAmounts: [5, 10, 20, 50, 100, 200],
    customAmount: ''
  },
  methods: {
    onNoop() {},
    onQuickBet(e) {
      const amount = parseInt(e.currentTarget.dataset.amount)
      this.setData({ customAmount: '' })
      this.emitBet(amount)
    },
    onAllIn() {
      const amount = this.properties.score
      if (amount <= 0) {
        wx.showToast({ title: '积分不足', icon: 'none' })
        return
      }
      wx.showModal({
        title: 'ALL IN',
        content: `确定下注全部 ${amount} 分？`,
        confirmColor: '#d63031',
        success: (res) => {
          if (res.confirm) {
            this.setData({ customAmount: '' })
            this.emitBet(amount)
          }
        }
      })
    },
    onCustomInput(e) {
      this.setData({ customAmount: e.detail.value })
    },
    onCustomConfirm() {
      const amount = parseInt(this.data.customAmount)
      if (!amount || amount <= 0) {
        wx.showToast({ title: '请输入有效金额', icon: 'none' })
        return
      }
      this.setData({ customAmount: '' })
      this.emitBet(amount)
    },
    emitBet(amount) {
      if (amount > this.properties.score) {
        wx.showToast({ title: '积分不足', icon: 'none' })
        return
      }
      if (this.properties.maxBet && amount > this.properties.maxBet) {
        wx.showToast({ title: `单次上限 ${this.properties.maxBet}`, icon: 'none' })
        return
      }
      this.triggerEvent('bet', { amount })
    },
    onClose() {
      this.setData({ customAmount: '' })
      this.triggerEvent('close')
    }
  }
})
