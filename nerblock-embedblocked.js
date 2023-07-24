if (typeof chrome.runtime === "undefined") chrome = browser;

function initPage() {
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('url')) {
        var url = urlParams.get('url').replace(/^http(s?):\/\//, "").replace(/\/$/, "");
        var blockedUrlEl = document.querySelector("#blockedUrl");
        document.title = url;
        blockedUrlEl.innerHTML = url;
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPage);
} else {
    initPage();
}

var myPort = chrome.runtime.connect();
var urlParams = new URLSearchParams(window.location.search);

if (urlParams.has('url')) {
    myPort.postMessage({
        iframe: true,
        url: urlParams.get('url')
    });
}
