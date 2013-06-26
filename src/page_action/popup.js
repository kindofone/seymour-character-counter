function showActive() {
	document.querySelector('header .title').innerHTML = 'Seymour is now <span class="seymore-state-label">active</span> for ' +  getDomain();
	document.querySelector('header .subtitle').innerHTML = 'The counter will appear on input fields and text areas while typing.';

	document.querySelector('header #activationToggle').innerHTML = "Deactivate";
	document.querySelector('body').className = "active";

	document.querySelector('section').innerHTML = '<table class="setting">\
		<tr>\
			<td class="setting group-name">Domain Specific Settings</td>\
		</tr>\
		<tr>\
			<td class="setting group-content">\
				<div class="setting bundle text">\
					<div class="setting container text">\
						<label class="setting label text">Character Limit</label>\
						<input class="setting element text" id="charLimit" type="text" placeholder="Number">\
					</div>\
				</div>\
				<div class="setting bundle checkbox">\
					<div class="setting container checkbox">\
						<input id="forceCharLimit" class="setting element checkbox" type="checkbox" value="true">\
						<label class="setting label checkbox" for="forceCharLimit">Force Character Limit</label>\
					</div>\
				</div>\
			</td>\
		</tr>\
	</table>';

	var charLimit = chrome.extension.getBackgroundPage().options.charLimit;
	document.getElementById('charLimit').value = charLimit;

	var forceCharLimit = chrome.extension.getBackgroundPage().options.forceCharLimit;
	document.getElementById('forceCharLimit').checked = (((forceCharLimit == 'true') || (forceCharLimit == true)) ? true : false);

	document.getElementById('charLimit').addEventListener('input', function(e) {
		var newVal = this.value;
		if (!isNaN(newVal) && newVal > 0) {
			chrome.extension.getBackgroundPage().setOptions('charLimit', newVal);
		}
	});
	
	document.getElementById('forceCharLimit').addEventListener('change', function(e) {
		var newVal = this.checked;
		chrome.extension.getBackgroundPage().setOptions('forceCharLimit', newVal);
	});
}

function showInactive() {
	document.querySelector('header .title').innerHTML = 'Seymour is <span class="seymore-state-label">inactive</span> for ' + getDomain();
	document.querySelector('header .subtitle').innerHTML = "";

	document.querySelector('header #activationToggle').innerHTML = "Activate";
	document.querySelector('body').className = "inactive";

	document.querySelector('section').innerHTML = '';
}

function getDomain() {
	var tab = chrome.extension.getBackgroundPage().selectedTab;
	var uri = new URI(tab.url);
	var domain = uri.domain();
	var subdomain = uri.subdomain();
	tabDomain = (subdomain != '' ? subdomain + '.' + domain : domain);
	return tabDomain;
};

var tabDomain;
window.onload = function() {
	document.querySelector('header #activationToggle').addEventListener('click', function() {
		var isActiveAfterToggle = chrome.extension.getBackgroundPage().toggleSeymour();

		if (isActiveAfterToggle) {
			showActive();
		} else {
			showInactive();
		}
	});

	var isActive = chrome.extension.getBackgroundPage().isSelectedTabActive;
	if (!isActive) {
		chrome.extension.getBackgroundPage().setSeymourState("activate");
	}
	showActive();
}