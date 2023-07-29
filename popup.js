document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("renameButton").addEventListener("click", renameTab);
  });
  
  function renameTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          function: changeTitle,
        },
        () => {
          if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError);
          }
        }
      );
    });
  
    function changeTitle() {
      document.title = "test";
    }
  }
  