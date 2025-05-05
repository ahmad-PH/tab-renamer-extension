const chrome = {
    runtime: {
      onMessage: {
        addListener: jest.fn()
      },
      onInstalled: {
        addListener: jest.fn()
      },
      onConnect: {
        addListener: jest.fn()
      },
      onStartup: {
        addListener: jest.fn()
      }
    },
    tabs: {
      onRemoved: {
        addListener: jest.fn()
      },
      onUpdated: {
        addListener: jest.fn()
      },
      query: jest.fn(() => []),
      create: jest.fn(),
      remove: jest.fn(),
      discard: jest.fn(),
      reload: jest.fn()
    },
    commands: {
      onCommand: {
        addListener: jest.fn()
      }
    },
    action: {
      onClicked: {
        addListener: jest.fn()
      }
    },
    contextMenus: {
      create: jest.fn(),
      onClicked: {
        addListener: jest.fn()
      }
    },
    storage: {
      sync: {
        remove: jest.fn(),
        get: jest.fn(),
        set: jest.fn()
      }
    },
    scripting: {
      executeScript: jest.fn()
    }
  };


module.exports = chrome;