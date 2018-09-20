chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.sync.set({ darkMode: false }, function () {
    console.log("The color is green.");
  });
});