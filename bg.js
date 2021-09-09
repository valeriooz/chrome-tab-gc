var accessTimes = {};
var OLD_AGE = 60000 * 60 * 4;
var GC_INTERVAL = 60000;
var UPDATE_INTERVAL = 60000;
var MAX_HISTORY = 10;
var ARCHIVE_MODE = false;
var BOOKMARK_FOLDER = null;

var lastRemoved = [];

// load configuration
function loadConfig() {
    var conf_age = localStorage["old_age_mins"];
    if (conf_age) {
        OLD_AGE = conf_age * 60000;
    }
    var archive_mode = localStorage["archive_mode"];
    if (archive_mode) {
        ARCHIVE_MODE = true;
    }
    var bookmark_folder = localStorage["bookmark_folder"]
    if (ARCHIVE_MODE && bookmark_folder) {
        BOOKMARK_FOLDER = bookmark_folder;
    } else if (ARCHIVE_MODE && !bookmark_folder) {
        chrome.bookmarks.create(
            { 'title': 'Tab Archive' },
            function (newFolder) {
                BOOKMARK_FOLDER = newFolder.id;
                localStorage["bookmark_folder"] = newFolder.id;
            },
        );
    }
}

// update access time of a tab
function updateAccess(tabId) {
    accessTimes[tabId] = new Date();
}

// store removed tab to the history list
function rememberRemoval(tab) {
    lastRemoved.unshift(tab);

    if (lastRemoved.length > MAX_HISTORY) {
        lastRemoved.pop();
    }
}

// return last removed tabs
function getLast() {
    return lastRemoved;
}

// load config at startup
loadConfig();

// update time of all tabs on plugin load
chrome.tabs.query({}, function (tabs) {
    for (var i in tabs) {
        var tab = tabs[i];
        updateAccess(tab.id);
    }
});

// handle new tab event
chrome.tabs.onCreated.addListener(function (tab) {
    updateAccess(tab.id);
});

// handle active tab event
chrome.tabs.onActivated.addListener(function (activeInfo) {
    updateAccess(activeInfo.tabId);
});

// handle tab removal event
chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
    delete accessTimes[tabId];
});

// archive tab before removal
async function archiveTab(tab, accessTime) {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const tree = await chrome.bookmarks.getSubTree(BOOKMARK_FOLDER);
    const month = months[accessTime.getMonth()];
    const year = accessTime.getFullYear();
    const monthYear = `${month} ${year}`;
    console.log(monthYear)
    console.log(tab)
    console.log(tree)
    // filter tree to find folder monthYear
    // id could be risky if user moves folder, could be breach of trust
    // if does not exist, chrome.bookmarks.create of monthYear folder with parentId BOOKMARK_FOLDER
    // if exists, chrome.bookmarks.create with parentId of found node, title tab.title, url tab.url
    // test with page suspenders, might give problems
    // should the extension remove duplicates? up to user maybe?
}

// close all old inactive and unpinned tabs 
async function garbageCollect() {
    // remove
    for (var tabIdStr in accessTimes) {
        var tabId = parseInt(tabIdStr, 10);
        var accessTime = accessTimes[tabId];
        var now = new Date();

        if ((now - accessTime) >= OLD_AGE) {
            const tab = await chrome.tabs.get(tabId);
            if (!tab.pinned && !tab.active) {
                if (ARCHIVE_MODE) {
                    archiveTab(tab, accessTime);
                }
                chrome.tabs.remove([tab.id]);
                rememberRemoval(tab);
            }
        }
    }
}

// update access time for active tab
function updateActive() {
    chrome.tabs.query({ active: true }, function callback(tabs) {
        for (var i in tabs) {
            var tab = tabs[i];
            updateAccess(tab.id);
        }
    });
}



setInterval(garbageCollect, GC_INTERVAL);
setInterval(updateActive, UPDATE_INTERVAL);