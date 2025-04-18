// Event listener for when the extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  chrome.tabs.create({ url: "../timesheet.html" });
});
