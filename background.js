chrome.commands.onCommand.addListener((command) => {
    if (command === "open_rename_dialog") {
        chrome.tabs.query({active: true, currentWindow: true}).then(tabs => {
            console.log('tabs returned:', tabs);
            chrome.tabs.sendMessage(tabs[0].id, 'open_rename_dialog');
        }).catch(error => 
            {console.log('query error', error);}
        );
    }
});


// Might be needed later, for making sure the contentScript gets injected when
// the extension it is installed or updated:

// chrome.runtime.onInstalled.addListener(async () => {
//     const allTabs = await chrome.tabs.query({});
//     allTabs.forEach((tab) => {
//         if (tab.url.startsWith('http://') || tab.url.startsWith('https://')) {
//             try {
//                 chrome.scripting.executeScript({
//                     target: {tabId: tab.id},
//                     files: ['contentScript.js']
//                 });
//                 // console.log('success:', tab.url);
//             } catch (error) {
//                 console.log('error:', error);
//             }
//         }
//     });
// });
