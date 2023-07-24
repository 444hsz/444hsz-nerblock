if (typeof chrome.runtime === "undefined") chrome = browser;

var bgpage = chrome.extension.getBackgroundPage(),
    keys = Object.keys(bgpage.nerSites);

$(function(){
    var blocklist = $("#blocklist");
    for (var i=0; i<keys.length; i+=1) {
        var title;
        switch (keys[i]) {
            default:
            case "domains":
                title = "Blokkolt weboldalak:";
                break;
            case "facebook":
                title = "Blokkolt közösségimédia oldalak:";
        }
        blocklist.append("<h3>" + title + "</h3>");
        bgpage.nerSites[keys[i]].map(function(v) {
            blocklist.append("<li>" + v.replace(/^\*\./, "") + "</li>");
        });
    }
});

