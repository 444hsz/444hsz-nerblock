if (typeof chrome.runtime === "undefined") chrome = browser;

// browser detection
var isOpera =
  (!!window.opr && !!opr.addons) ||
  !!window.opera ||
  navigator.userAgent.indexOf(" OPR/") >= 0;
var isFirefox = typeof InstallTrigger !== "undefined";
var isIE = /*@cc_on!@*/ false || !!document.documentMode;
var isEdge = !isIE && !!window.StyleMedia;
var isChrome = !isOpera && !isFirefox && !isIE && !isEdge;
var isBlink = (isChrome || isOpera) && !!window.CSS;

tabBlocks = {};
tabPauses = {};
globalPause = false;

function reloadAllTabs() {
  var querying = chrome.tabs.query({}, function (tabs) {
    for (var i = 0; i < tabs.length; i++) {
      var reloadurl = false;
      if (
        typeof tabBlocks[tabs[i].id] !== "undefined" &&
        tabBlocks[tabs[i].id].blocks.length > 0
      ) {
        for (var j = 0; j < tabBlocks[tabs[i].id].blocks.length; j++) {
          if (tabBlocks[tabs[i].id].blocks[j].type == "main_frame") {
            reloadurl = tabBlocks[tabs[i].id].blocks[j].url;
            break;
          }
        }
        if (reloadurl) {
          chrome.tabs.update(tabs[i].id, { url: reloadurl });
        } else {
          chrome.tabs.reload(tabs[i].id, { bypassCache: true });
        }
      }
    }
  });
}

function setIconForTab(tabId, iconType, badge) {
  var iconBaseName;
  switch (iconType) {
    case "allow":
      iconBaseName = "icon-allow";
      break;
    default:
    case "deny":
      iconBaseName = "icon";
      break;
  }
  chrome.browserAction.setIcon({
    path: {
      16: "images/" + iconBaseName + "16.png",
      19: "images/" + iconBaseName + "19.png",
      24: "images/" + iconBaseName + "24.png",
      32: "images/" + iconBaseName + "32.png",
      38: "images/" + iconBaseName + "38.png",
    },
    tabId: tabId,
  });
  if (typeof badge !== "undefined") {
    chrome.browserAction.setBadgeBackgroundColor({
      tabId: tabId,
      color: "#646464",
    });
    chrome.browserAction.setBadgeText({ text: badge, tabId: tabId });
  }
}

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status == "complete") {
    if (!globalPause) {
      if (typeof tabBlocks[tabId] !== "undefined") {
        if (tabBlocks[tabId].blocks.length > 0) {
          setIconForTab(tabId, "deny", String(tabBlocks[tabId].blocks.length));
        } else {
          setIconForTab(tabId, "allow", "");
        }
      }
    } else {
      setIconForTab(tabId, "allow", "");
    }
  }
});

chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
  if (typeof tabBlocks[tabId] !== "undefined") {
    delete tabBlocks[tabId];
  }
  if (typeof tabPauses[tabId] !== "undefined") {
    delete tabPauses[tabId];
  }
});

chrome.tabs.onCreated.addListener(function (tab) {
  //setIconForTab(tab.id, "allow", "");
  tabPauses[tab.id] = false;
});

chrome.webRequest.onBeforeRequest.addListener(
  function (details) {
    var isNERSite = false,
      url = new URL(details.url),
      keys = Object.keys(nerSites);

    if (
      globalPause ||
      (url.protocol == "chrome-extension:" &&
        url.pathname == "/nerblock-pageblocked.html") || // dont run on extension pages
      (isEdge && url.pathname.endsWith("/ErrorPages/dnserror.html")) // dont run on edge error page
    ) {
      return { cancel: false };
    }

    findnersite: for (var i = 0; i < keys.length; i += 1) {
      if (
        nerSites[keys[i]].find(function (v) {
          if (url.hostname === v.replace(/^\*\./, "")) {
            //console.log("exact domain match");
            return true;
          } else if (url.hostname.endsWith(v.replace(/^\*/, ""))) {
            //console.log("wildcard domain match");
            return true;
          } else if (
            String(url.hostname + url.pathname.replace(/\/$/, "")) ===
            v.replace(/^\*\./, "")
          ) {
            //console.log("exact url match");
            return true;
          } else if (
            String(url.hostname + url.pathname.replace(/\/$/, "")).endsWith(
              v.replace(/^\*/, "")
            )
          ) {
            //console.log("wildcard url match");
            return true;
          }
          return false;
        })
      ) {
        isNERSite = true;
        break findnersite;
      }
    }

    //TODO: intercept requests with tabid -1
    if (details.tabId > -1) {
      if (
        details.type == "main_frame" ||
        typeof tabBlocks[details.tabId] == "undefined"
      ) {
        tabBlocks[details.tabId] = {
          blocks: [],
        };
        if (typeof tabPauses[details.tabId] == "undefined") {
          tabPauses[details.tabId] = false;
        }
      }

      // nerblock is paused on this tab
      if (
        typeof tabPauses[details.tabId] !== "undefined" &&
        tabPauses[details.tabId] === true
      ) {
        return { cancel: false };
      }

      // skip adding iframes
      // - except on Edge, because it needs workaround
      if (details.type !== "sub_frame" || isEdge) {
        if (isNERSite) {
          tabBlocks[details.tabId].blocks.push({
            url: details.url,
            type: details.type,
          });
        }
      }

      // we need to update the icon here too, because some requests don't trigger the tab's onupdate event
      // (but doing this will result in an uncatched exception in some cases)
      if (details.type == "xmlhttprequest") {
        if (tabBlocks[details.tabId].blocks.length > 0) {
          setIconForTab(
            details.tabId,
            "deny",
            String(tabBlocks[details.tabId].blocks.length)
          );
        }
      }
    }

    var ret = {
      cancel: isNERSite,
    };
    if (isNERSite) {
      console.log(`Nerblock blocked: ${details.url} (${details.type})`);
      if (!isEdge) {
        switch (details.type) {
          case "sub_frame":
            ret = {
              redirectUrl: chrome.runtime.getURL(
                "nerblock-embedblocked.html?url=" +
                  encodeURIComponent(details.url)
              ),
            };
            break;
          case "main_frame":
            ret = {
              redirectUrl: chrome.runtime.getURL(
                "nerblock-pageblocked.html?url=" +
                  encodeURIComponent(details.url)
              ),
            };
            break;
          default:
        }
      }
    }

    return ret;
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

var portFromCS;
chrome.runtime.onConnect.addListener(function (p) {
  portFromCS = p;
  portFromCS.onMessage.addListener(function (m, s) {
    // add iframe to tab's blocklist now
    if (m.iframe) {
      tabBlocks[s.sender.tab.id].blocks.push({
        url: m.url,
        type: "sub_frame",
      });
      setIconForTab(
        s.sender.tab.id,
        "deny",
        String(tabBlocks[s.sender.tab.id].blocks.length)
      );
    }
  });
});
