async function openRenameDialog(driver) {
    return await driver.executeScript("document.dispatchEvent(new Event('openRenameDialog'));");
}

module.exports = {
    openRenameDialog,
}
