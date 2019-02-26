chrome.browserAction.onClicked.addListener(function(){
  chrome.tabs.create({url:"timesheet.html"}, function(tab){
  });
});
