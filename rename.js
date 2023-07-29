document.addEventListener('DOMContentLoaded', function() {
    let renameInput = document.getElementById('newName');
  
    // Autofocus on the text box
    renameInput.focus();
  
    // Handle Enter key press
    renameInput.addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        // Get the tab ID from the query string
        let url = new URL(window.location.href);
        let tabId = parseInt(url.searchParams.get('tabId'));

        var newName = document.getElementById('newName').value;
        chrome.storage.sync.get(['renamingTabId'], function(result) {
            console.log('result from sync:', result);
            renameTab(result.renamingTabId, newName);
        });
  
        // Rename the tab
        // chrome.tabs.sendMessage(tabId, {name: renameInput.value});
      }
    });
  });

function renameTab(tabId, newName) {
chrome.scripting.executeScript(
    {
    target: {tabId: tabId},
    function: function(newName) {
        document.title = newName;
    },
    args: [newName]
    },
    () => {
    if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
    }
    window.close();
    }
);
}
  