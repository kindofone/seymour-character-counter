var options = {};
var selectedOptions = null;
var selectedTab = {};
var isSelectedTabActive = false;

var pageActionStates = {};
pageActionStates['default'] = {iconURL: chrome.runtime.getURL("icons/icon38.png"), title: 'Seymour: Personal Typist'};
pageActionStates['disabled'] = {iconURL: chrome.runtime.getURL("icons/icon38.png"), title: 'Seymour is unavailable for this domain'};
pageActionStates['active'] = {iconURL: chrome.runtime.getURL("icons/iconActive38.png"), title: 'Seymour is active'};
pageActionStates['inactive'] = {iconURL: chrome.runtime.getURL("icons/iconInactive38.png"), title: 'Seymour is inactive'};

function toggleSeymour() {
	var toggleAction = (isSelectedTabActive ? 'deactivate' : 'activate');
	setSeymourState(toggleAction);
	return !isSelectedTabActive; // setSeymourState is async so isSelectedTabActive wasn't updated yet on this line
}

function setSeymourState(state) {
	chrome.tabs.sendMessage(selectedTab.id, {action: state}, function(response) {
		if (response === 'active') {
			isSelectedTabActive = true;
		} else if (response === 'inactive') {
			isSelectedTabActive = false;
		}
	});
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	switch (request.method) {
		case "getLocalStorage":
		{
			sendResponse({data: localStorage[request.key]});
		}
		break;

		case "setPageActionIcon":
		{
			setPageActionIcon(request.state);
		}
		break;

		default:
		{
			sendResponse({});
		}
		break;
	}
	return true;
});

function setPageActionIcon(state) {
	// console.log('chrome.pageAction.setIcon', (request.iconURL.indexOf('Active') > -1 ? 'ActiveIcon' : 'InactiveIcon'), sender);
	chrome.tabs.getSelected(null, (function() {
		return function(tab) {
			var iconURL, title;

			switch (state) {
				case 'disabled': { iconURL = pageActionStates.disabled.iconURL; title = pageActionStates.disabled.title; } break;
				case 'active': { iconURL = pageActionStates.active.iconURL; title = pageActionStates.active.title; } break;
				case 'inactive': { iconURL = pageActionStates.inactive.iconURL; title = pageActionStates.inactive.title; } break;
				default: { iconURL = pageActionStates.default.iconURL; title = pageActionStates.default.title; } break;
			}

			console.log('tabId: ', tab.id, 'iconURL: ', iconURL, 'title: ', title);
			chrome.pageAction.setIcon({
				tabId: tab.id,
				path: iconURL
			});
			chrome.pageAction.setTitle({
				tabId: tab.id,
				title: title
			});
		};
	})(state));
}

function setOptions(option, value) {
	chrome.tabs.sendMessage(selectedTab.id, {action: 'setOptions', key: option, value: value}, function(response) {
		options[response.option] = response.value;
	});
}

function handshake() {
	chrome.tabs.sendMessage(selectedTab.id, {action: 'handshake'}, function(response) {
		if (!chrome.runtime.lastError) {
			initTab();
		} else {
            console.log('executeScript', selectedTab.id);
			chrome.tabs.executeScript(selectedTab.id, { file: "src/inject/inject.js", allFrames: true }, function() {
				if (!chrome.runtime.lastError) {
            		console.log('no error in executeScript', selectedTab.id);
            		console.log('insertCSS', selectedTab.id);
            		chrome.tabs.insertCSS(selectedTab.id, { file: "src/inject/inject.css", allFrames: true }, function() {
            			if (!chrome.runtime.lastError) {
            				console.log('no error in insertCSS', selectedTab.id);
            				console.log('injected');
            				initTab();
		            	} else {
		            		console.log('error in insertCSS: ', chrome.runtime.lastError, selectedTab.id);
		            		setPageActionIcon('disabled');
		            	}
	            	});
            	} else {
            		console.log('error in executeScript: ', chrome.runtime.lastError, selectedTab.id);
            		setPageActionIcon('disabled');
            	}
            });
		}
	});
}

function initTab() {
	updateActiveState();
	updateOptions();
}

function updateActiveState() {
	console.log('updateActiveState sendMessage request');
	chrome.tabs.sendMessage(selectedTab.id, {action: 'getActiveFlag'}, function(response) {
		console.log('updateActiveState sendMessage response');
		isSelectedTabActive = response;
	});
}

function updateOptions() {
	console.log('updateOptions sendMessage request');
	chrome.tabs.sendMessage(selectedTab.id, {action: 'getOptions'}, function(response) {
		console.log('updateOptions sendMessage response');
		options = response;
		chrome.pageAction.show(selectedTab.id);
    	console.log('pageAction shown');
	});
}

// listen to url in tab change event
chrome.tabs.onUpdated.addListener(function(tabId, change, tab) {
	console.log('onUpdated', tabId);
	if (change.status == "complete") {
		selectedTab = tab;
		console.log('onUpdated, change.status == complete', selectedTab);
		handshake();
	}
});

// listen to tab change event
chrome.tabs.onActivated.addListener(function(activeInfo) {
	console.log('onActivated', activeInfo.tabId);
	chrome.tabs.get(activeInfo.tabId, function(tab) {
		selectedTab = tab;
		console.log('onActivated, got active tab info', selectedTab);
		handshake();
	});
});

// get current tab (onload)
chrome.tabs.query({active: true}, function(tab) {
	selectedTab = tab[0];
	console.log('tabs.query, got active tab info', selectedTab);
	handshake();
});

// var storage = chrome.storage.sync;

// function setItem(key, value) {
// 	storage.set({key: value}, function() {
// 		// Notify that we saved.
// 	});
// }

// function getItem(key, callback) {
// 	storage.get({key: ''}, (function() {
// 		return function(items) {
// 			callback(items.key);
// 		};		
// 	})(callback));
// }