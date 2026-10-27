module.exports = {
  Platform: {
    OS: 'ios',
    select: (obj) => obj.ios || obj.default
  },
  Linking: {
    openURL: jest.fn().mockResolvedValue(true),
    canOpenURL: jest.fn().mockResolvedValue(true)
  },
  Alert: {
    alert: jest.fn()
  }
};
