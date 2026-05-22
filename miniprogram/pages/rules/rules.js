Page({
  data: {
    hands: [
      {
        name: '皇家同花顺',
        desc: '同花色的 A-K-Q-J-10，最大牌型',
        cards: [
          { rank: 'A', suit: 'spade' }, { rank: 'K', suit: 'spade' },
          { rank: 'Q', suit: 'spade' }, { rank: 'J', suit: 'spade' }, { rank: '10', suit: 'spade' }
        ]
      },
      {
        name: '同花顺',
        desc: '同花色连续五张牌',
        cards: [
          { rank: '9', suit: 'spade' }, { rank: '8', suit: 'spade' },
          { rank: '7', suit: 'spade' }, { rank: '6', suit: 'spade' }, { rank: '5', suit: 'spade' }
        ]
      },
      {
        name: '四条',
        desc: '四张相同点数 + 一张散牌',
        cards: [
          { rank: 'A', suit: 'spade' }, { rank: 'A', suit: 'red' },
          { rank: 'A', suit: 'diamond' }, { rank: 'A', suit: 'club' }, { rank: 'K', suit: 'spade' }
        ]
      },
      {
        name: '葫芦',
        desc: '三条 + 一对',
        cards: [
          { rank: 'K', suit: 'spade' }, { rank: 'K', suit: 'red' },
          { rank: 'K', suit: 'diamond' }, { rank: '8', suit: 'spade' }, { rank: '8', suit: 'red' }
        ]
      },
      {
        name: '同花',
        desc: '五张同花色（不连续）',
        cards: [
          { rank: 'A', suit: 'spade' }, { rank: 'Q', suit: 'spade' },
          { rank: '8', suit: 'spade' }, { rank: '4', suit: 'spade' }, { rank: '2', suit: 'spade' }
        ]
      },
      {
        name: '顺子',
        desc: '五张连续点数（不同花色）',
        cards: [
          { rank: '10', suit: 'spade' }, { rank: '9', suit: 'red' },
          { rank: '8', suit: 'diamond' }, { rank: '7', suit: 'spade' }, { rank: '6', suit: 'club' }
        ]
      },
      {
        name: '三条',
        desc: '三张相同点数 + 两张散牌',
        cards: [
          { rank: '7', suit: 'spade' }, { rank: '7', suit: 'red' },
          { rank: '7', suit: 'diamond' }, { rank: 'K', suit: 'spade' }, { rank: '2', suit: 'club' }
        ]
      },
      {
        name: '两对',
        desc: '两个对子 + 一张散牌',
        cards: [
          { rank: 'A', suit: 'spade' }, { rank: 'A', suit: 'red' },
          { rank: '8', suit: 'diamond' }, { rank: '8', suit: 'club' }, { rank: '3', suit: 'spade' }
        ]
      },
      {
        name: '一对',
        desc: '两张相同点数 + 三张散牌',
        cards: [
          { rank: 'K', suit: 'spade' }, { rank: 'K', suit: 'red' },
          { rank: 'A', suit: 'diamond' }, { rank: '7', suit: 'spade' }, { rank: '3', suit: 'club' }
        ]
      },
      {
        name: '高牌',
        desc: '无任何组合，比最大单张',
        cards: [
          { rank: 'A', suit: 'spade' }, { rank: 'K', suit: 'red' },
          { rank: '9', suit: 'diamond' }, { rank: '5', suit: 'spade' }, { rank: '2', suit: 'club' }
        ]
      }
    ]
  }
})
