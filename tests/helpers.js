async function openRenameDialog(driver) {
    return await driver.executeScript("document.dispatchEvent(new Event('openRenameDialog'));");
}

async function getAttribute(driver, element, attribute) {
    return await driver.executeScript(`return arguments[0].getAttribute("${attribute}")`, element);
}

module.exports = {
    openRenameDialog, getAttribute
}
