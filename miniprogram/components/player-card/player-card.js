Component({
  properties: {
    player: {
      type: Object,
      value: {}
    },
    isSelf: {
      type: Boolean,
      value: false
    }
  },
  methods: {
    onTapAvatar() {
      const { player } = this.properties
      if (player.avatar) {
        wx.previewImage({
          urls: [player.avatar],
          current: player.avatar
        })
      }
    }
  }
})
