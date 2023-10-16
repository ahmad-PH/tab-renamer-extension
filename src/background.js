chrome.commands.onCommand.addListener((command) => {
    if (command === "open_rename_dialog") {
        chrome.tabs.query({active: true, currentWindow: true}).then(tabs => {
            console.log('tabs returned:', tabs);
            chrome.tabs.sendMessage(tabs[0].id, {
                command: 'open_rename_dialog',
                tabId: tabs[0].id
            });
        }).catch(error => 
            {console.log('query error', error);}
        );
    }
});

// Listen for any messages from content scripts.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.command === "get_tab_info") {
      sendResponse({ id: sender.tab.id,  url: sender.tab.url, index: sender.tab.index});
    }
  });

// Remove the tab's name information once it is closed
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
    chrome.storage.sync.remove(String(tabId));
});

// Might be needed later, for making sure the contentScript gets injected when
// the extension is installed or updated:
chrome.runtime.onInstalled.addListener(async () => {
    const allTabs = await chrome.tabs.query({});
    console.log('after query:', allTabs);
    allTabs.forEach(async (tab) => {
        if (!tab.url.startsWith('chrome://')) { // These urls are browser-protected
            try {
                await chrome.scripting.executeScript({
                    target: {tabId: tab.id},
                    files: ['contentScript.js']
                });
                await chrome.scripting.insertCSS({
                    target: {tabId: tab.id},
                    files: ['assets/styles.css']
                });
            } catch (e) {
                console.log('error while processing', tab.url);
                console.log(e);
            }
        }
    });
});

chrome.runtime.onConnect.addListener((port) => {
    console.assert(port.name === "content-script");
    console.log('Connection with content script established successfully.');
});
