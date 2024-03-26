// Event listener for when the extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  const productionTab = await chrome.tabs.create({ url: "../timesheet.html" });
});
