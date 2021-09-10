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
    ARCHIVE_MODE = archive_mode === "true" ? true : false;

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
function archiveTab(tab, parent) {
    return function () {
        return new Promise(function (resolve, reject) {
            chrome.bookmarks.create({ 'parentId': parent.id, 'title': tab.title, 'url': tab.url })
            resolve();
        })
    }
}

function createSubFolder(accessTime) {
    return new Promise(function (resolve, reject) {
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const month = months[accessTime.getMonth()];
        const year = accessTime.getFullYear();
        const monthYear = `${month} ${year}`;
        let parent = undefined;
        let sequence = Promise.resolve()
        chrome.bookmarks.getSubTree(BOOKMARK_FOLDER, function (tree) {
            parent = tree[0].children.filter(child => child.title === monthYear)[0];
            if (!parent) {
                sequence.then(() => {
                    return new Promise(function (resolve, reject) {
                        chrome.bookmarks.create({ 'parentId': BOOKMARK_FOLDER, 'title': monthYear }, function (bookmark) {
                            console.log(bookmark)
                            resolve(bookmark)
                        });
                    });
                }).then((parent) => resolve(parent));
            } else {
                resolve(parent);
            }
            // Proceed to the next
        });
    });
}

// close all old inactive and unpinned tabs 
function garbageCollect() {
    // remove
    var parent = Promise.resolve()
    for (var tabIdStr in accessTimes) {
        var tabId = parseInt(tabIdStr, 10);
        var accessTime = accessTimes[tabId];
        var now = new Date();
        if ((now - accessTime) >= OLD_AGE) {

            chrome.tabs.get(tabId, function (tab) {
                if (!tab.pinned && !tab.active) {
                    if (ARCHIVE_MODE) {
                        parent.then(() => createSubFolder(accessTime)).then((parent) => archiveTab(tab, parent));
                    }
                    chrome.tabs.remove([tab.id]);
                    rememberRemoval(tab);
                }
            });
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