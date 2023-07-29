chrome.runtime.onInstalled.addListener(function() {
    chrome.contextMenus.create({
      "id": "renameTab",
      "title": "Rename Tab",
      "contexts": ["all"]
    });
  });

  chrome.contextMenus.onClicked.addListener(function(info, tab) {
    if (info.menuItemId === "renameTab") {
      chrome.windows.create({
        url: chrome.runtime.getURL("rename.html"),
        type: "popup",
        width: 300,
        height: 200
      }, function(win) {
        // save tab id for later
        chrome.storage.sync.set({renamingTabId: tab.id});
      });
    }
  });

  chrome.commands.onCommand.addListener(function(command) {
    console.log('command listener');
    if(command === 'rename_tab') {
        console.log(' it is a rename tab');
        chrome.windows.create({
        url: chrome.runtime.getURL("rename.html"),
        type: "popup",
        width: 300,
        height: 200
        });
    }
  });