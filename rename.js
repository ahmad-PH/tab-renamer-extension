document.addEventListener('DOMContentLoaded', (event) => {
    document.getElementById('rename').onclick = function() {
        var newName = document.getElementById('newName').value;
        chrome.storage.sync.get(['renamingTabId'], function(result) {
            console.log('result from sync:', result);
        renameTab(result.renamingTabId, newName);
        });
    }
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
  