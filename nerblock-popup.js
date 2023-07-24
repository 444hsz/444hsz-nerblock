if (typeof chrome.runtime === "undefined") chrome = browser;

var bgpage = chrome.extension.getBackgroundPage();

chrome.tabs.query({active: true, currentWindow: true}, function callback(tabs) {
    var currentTab = tabs[0];

    //TODO: settings ehhez
    $("#quote").show();

    var total = 0;
    var keys = Object.keys(bgpage.nerSites);
    for (var i=0; i<keys.length; i++) {
        total += bgpage.nerSites[keys[i]].length;
    }

    $("#total_blocked_count").html(total);
    if (typeof bgpage.tabBlocks[currentTab.id] !== "undefined") {
        $("#page_blocked_count").html(bgpage.tabBlocks[currentTab.id].blocks.length);
    }
    $("#block_counts").show();
    $("#separator0").show();

    $("#closeButton").click(closePopOut);

    $("#show_blocklist").click(function() {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('nerblock-options.html'));
        }
        closePopOut();
    });

    if (bgpage.globalPause) {
        $("#div_global_unpause_nerblock").show().click(function() {
            bgpage.globalPause = false;
            bgpage.reloadAllTabs();
            closePopOut();
        });
    } else {
        $("#div_global_pause_nerblock").show().click(function() {
            bgpage.globalPause = true;
            bgpage.reloadAllTabs();
            closePopOut();
        });
        if (bgpage.tabPauses[currentTab.id]) {
            $("#div_tab_unpause_nerblock").show().click(function() {
                bgpage.tabPauses[currentTab.id] = false;
                chrome.tabs.reload({bypassCache: true});
                closePopOut();
            });
        } else {
            $("#div_tab_pause_nerblock").show().click(function() {
                var reloadurl = false;
                if (bgpage.tabBlocks[currentTab.id].blocks.length > 0) {
                    for (var i=0; i<bgpage.tabBlocks[currentTab.id].blocks.length; i++) {
                        if (bgpage.tabBlocks[currentTab.id].blocks[i].type == "main_frame") {
                            reloadurl = bgpage.tabBlocks[currentTab.id].blocks[i].url;
                            break;
                        }
                    }
                }
                bgpage.tabPauses[currentTab.id] = true;
                if (reloadurl) {
                    chrome.tabs.update(currentTab.id, {url: reloadurl});
                } else {
                    chrome.tabs.reload({bypassCache: true});
                }
                closePopOut();
            });
        }
    }
    /*
    if (bgpage.tabBlocks[currentTab.id].blocks.length > 0) {
        for (var i=0; i<bgpage.tabBlocks[currentTab.id].blocks.length; i++) {
            console.log(bgpage.tabBlocks[currentTab.id].blocks[i].url);
        }
    }
    */
});

function closePopOut()
{
    var gettingInfo = chrome.runtime.getPlatformInfo(function gotPlatformInfo(info) {
        var isFirefox = typeof InstallTrigger !== 'undefined';
        if (isFirefox && info.os == chrome.runtime.PlatformOs.ANDROID)
        {
            chrome.tabs.update({active: true});
        } else {
            window.close();
        }
    });
}
