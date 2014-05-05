var seymour = {
	// default values
	charLimit: 140,
	forceCharLimit: false,

	// icon URLs
	iconDefaultURL: "",

	// run-time flags
	activeFlag: false,
	keyCombinationFlag: false,
	DOMModifiedIdleTimer: null,
	DOMModifiedTimeStamp: null,
	DOMModifiedElement: null,

	activate: function() {
		document.addEventListener("DOMSubtreeModified", seymour.onDOMModified);
		document.addEventListener("scroll", seymour.onScroll);
		seymour.hook();
		seymour.extension.setDomainOption('autoactivate', 'true');
		seymour.activeFlag = true;
		seymour.extension.setActiveStateIcon('active');
	},

	deactivate: function() {
		document.removeEventListener("DOMSubtreeModified", seymour.onDOMModified);
		document.removeEventListener("scroll", seymour.onScroll);
		seymour.unhook();
		seymour.extension.setDomainOption('autoactivate', 'false');
		seymour.activeFlag = false;
		seymour.extension.setActiveStateIcon('inactive');
	},

	onDOMModified: function() {
		seymour.hook();
	},

	hook: function() {
		var inputs = document.querySelectorAll('input:not([data-seymour-input]), textarea:not([data-seymour-input]), *[contenteditable]:not([data-seymour-input])');
		for (var i = 0; i < inputs.length; i++) {
			var input = inputs[i];

			setTimeout((function() {
				return function() {
					input.addEventListener('focus', seymour.onFocusBeforeInit);
					input.setAttribute('data-seymour-input', 'true');
					input.setAttribute('data-seymour-in-focus', 'false');

					// some elements become contenteditable only onclick
					// we need to set focus on these, after they have been made editable
					// so Seymour onFocus function would be fired
					if (document.activeElement == input) {
                        seymour.initElement(input);
					}
				};
			})(input), 1);
		}
	},

	unhook: function() {
		var inputs = document.querySelectorAll('[data-seymour-input]');
		for (var i = 0; i < inputs.length; i++) {
			var input = inputs[i];

			input.removeAttribute('data-seymour-input');
			input.removeAttribute('data-seymour-in-focus');
			input.removeAttribute('data-seymour-count');
			input.removeEventListener('focus', seymour.onFocusBeforeInit);
			input.removeEventListener('focus', seymour.onFocus);
			input.removeEventListener('blur', seymour.onBlur);
			input.removeEventListener('keydown', seymour.onKeyDown);
			input.removeEventListener('keyup', seymour.onKeyUp);
		}

		var counters = document.querySelectorAll('.seymour-counter');
		for (var i = 0; i < counters.length; i++) {
			var counter = counters[i];
			counter.remove();
		}
	},

	initElement: function(element) {
		// set maxlength on field if forceCharLimit is true
		if (seymour.forceCharLimit) {
			element.setAttribute('maxlength', seymour.charLimit);
		}

		// create counter for element
		var elementId = seymour.helpers.getOrGenerateId(element);
		var counter = document.createElement('pre');
		counter.setAttribute('class', 'seymour-counter');
		counter.setAttribute('id', 'seymour-counter-for-'+elementId);
		counter.style.opacity = '0';

		// attach counter to body
		document.querySelector('body').appendChild(counter);

		// reset count and hook seymour events
		element.setAttribute('data-seymour-count', '0');
		element.addEventListener('focus', seymour.onFocus);
		element.addEventListener('blur', seymour.onBlur);
		element.addEventListener('keydown', seymour.onKeyDown);
		element.addEventListener('keyup', seymour.onKeyUp);

		// init called on focus, so call seymour onFocus if still got focus
		if (document.activeElement == element) {
			seymour.onFocus(null, element);
		}
	},

	updateElement: function(element) {
		var count = seymour.helpers.getValue(element).length;
		var ratio = -1 + (count / seymour.charLimit);

		// update seymour-count data attribute
		element.dataset.seymourCount = count;

		// update maxlength on element
		if (seymour.forceCharLimit) {
			element.setAttribute('maxlength', seymour.charLimit);
		} else {
			element.removeAttribute('maxlength');
		}

		// update counter with count value
		var counter = document.getElementById('seymour-counter-for-'+element.id);
		counter.innerHTML = (seymour.forceCharLimit ? count + '/' + seymour.charLimit : count);

		// update counter text color per closeness to preset char limit
		var color = seymour.helpers.colorLuminance('FF0000', ratio);
		counter.style.color = color;

		// update counter position if element moved or changed in size
		seymour.helpers.setCounterPos(element);
	},

	onScroll: function(e) {
		var inputsInFocus = document.querySelectorAll('[data-seymour-in-focus="true"]');
		for (var i = 0; i < inputsInFocus.length; i++) {
			var element = inputsInFocus[i];
			seymour.updateElement(element);
		}
	},

	onFocusBeforeInit: function(e) {
		var element = e.target;

		element.removeEventListener('focus', seymour.onFocusBeforeInit);
		seymour.initElement(element);
	},

	onFocus: function(e, element) {
		// might be called manually with a target inside 'element'
		if (!element) {
			var element = e.target;
		}

		seymour.extension.updateOptions();
		seymour.updateElement(element);
		
		// show counter
		var counter = document.getElementById('seymour-counter-for-'+element.id);
		counter.style.opacity = '1';
		element.setAttribute('data-seymour-in-focus', 'true');
	},

	onBlur: function(e) {
		var element = e.target;

		// hide counter
		var counter = document.getElementById('seymour-counter-for-'+element.id);
		counter.style.opacity = '0';
		element.setAttribute('data-seymour-in-focus', 'false');
	},

	onKeyDown: function(e) {
		var element = e.target;
		var count = seymour.helpers.getValue(element).length;

		// if element doesn't support maxlength, limit with programatically
		if (!('maxLength' in element) && seymour.forceCharLimit) {

			// if limit reached and force is on
			// approve any of the modifier keys
			var approvedKeyCodes = [8,9,13,16,17,18,19,20,27,33,34,35,36,37,38,39,40,45,46,91,144,145];
			
			// approve if there is any selected text in the element
			try {
				var isSelected = (seymour.helpers.getSelectedText().length > 0);
			} catch (ex) {
				var isSelected = false;
			}

			if (approvedKeyCodes.indexOf(e.keyCode) > 0) {
				seymour.keyCombinationFlag = true;
			}

			if ((count >= seymour.charLimit) &&
				(seymour.forceCharLimit) &&
				((approvedKeyCodes.indexOf(e.keyCode) == -1) && (!seymour.keyCombinationFlag)) &&
				(!isSelected)) {
				e.preventDefault();
			}
		}
	},

	onKeyUp: function(e) {
		var element = e.target;
		var count = seymour.helpers.getValue(element).length;

		seymour.keyCombinationFlag = false;

		if (!('maxLength' in element) && seymour.forceCharLimit) {
			if (count > seymour.charLimit) {
				var cutValue = seymour.helpers.getValue(element).substr(0, seymour.charLimit-1);
				seymour.helpers.setValue(element, cutValue);
				seymour.helpers.placeCaretAtEnd(element);
			}
		}

		seymour.updateElement(element);
	}
};

seymour.helpers = {
	getValue: function(element) {
		var value = element.value;

		if (!value) {
			value = element.innerText.replace(/(\r\n|\n|\r)/gm,"");
		}

		return value;
	},

	setValue: function(element, text) {
		var value = element.value;

		if (!value) {
			element.innerText = text;
		} else {
			element.value = text;
		}
	},

	getOffset: function(element) {
	    var _x = 0;
	    var _y = 0;
	    while( element && !isNaN( element.offsetLeft ) && !isNaN( element.offsetTop ) ) {
	        _x += element.offsetLeft - element.scrollLeft;
        	_y += element.offsetTop - element.scrollTop;
	        element = element.offsetParent;
	    }
	    return { top: _y, left: _x };
	},

	getViewportOffsets: function() {
		var w = window,
		    d = document,
		    e = d.documentElement,
		    g = d.getElementsByTagName('body')[0],
		    x = w.innerWidth || e.clientWidth || g.clientWidth,
		    y = w.innerHeight|| e.clientHeight|| g.clientHeight;

		return {width: x, height: y, scrollLeft: w.scrollX, scrollTop: w.scrollY};
	},

	setCounterPos: function(element) {
		var counter = document.getElementById('seymour-counter-for-' + element.id);
		var elementOffset = seymour.helpers.getOffset(element);
		var viewportOffsets = seymour.helpers.getViewportOffsets();

		var counterOffsetHeight = counter.offsetHeight;
		var counterOffsetTop = elementOffset.top + element.offsetHeight;
		var counterOffsetLeft = elementOffset.left;

		if (counterOffsetTop + counterOffsetHeight > viewportOffsets.height) {
			counterOffsetTop = elementOffset.top - counterOffsetHeight;
		}
		
		counter.style.top = counterOffsetTop + 'px';
		counter.style.left = counterOffsetLeft + 'px';
	},

	getOrGenerateId: (function () {
	  var incrementingId = 0;
	  return function(element) {
	    if (!element.id) {
	      element.id = "seymour-id-" + incrementingId++;
	    }
	    return element.id;
	  };
	}()),

	colorLuminance: function(hex, lum) {
		// validate hex string
		hex = String(hex).replace(/[^0-9a-f]/gi, '');
		if (hex.length < 6) {
			hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
		}
		lum = lum || 0;
		// convert to decimal and change luminosity
		var rgb = "#", c, i;
		for (i = 0; i < 3; i++) {
			c = parseInt(hex.substr(i*2,2), 16);
			c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
			rgb += ("00"+c).substr(c.length);
		}
		return rgb;
	},

	getSelectedText: function() {
	    var text = "";
	    if (window.getSelection) {
	        text = window.getSelection().toString();
	    } else if (document.selection && document.selection.type != "Control") {
	        text = document.selection.createRange().text;
	    }
	    return text;
	},

	placeCaretAtEnd: function(el) {
	    el.focus();
	    if (typeof window.getSelection != "undefined"
	            && typeof document.createRange != "undefined") {
	        var range = document.createRange();
	        range.selectNodeContents(el);
	        range.collapse(false);
	        var sel = window.getSelection();
	        sel.removeAllRanges();
	        sel.addRange(range);
	    } else if (typeof document.body.createTextRange != "undefined") {
	        var textRange = document.body.createTextRange();
	        textRange.moveToElementText(el);
	        textRange.collapse(false);
	        textRange.select();
	    }
	}
};

seymour.extension = {
	updateOptions: function() {
		seymour.extension.getOption("settings.charLimit", function(responseData) {
			var charLimit = parseInt(responseData);

			if (!isNaN(charLimit)) {
				seymour.charLimit = charLimit;
			}
		});

		seymour.extension.getOption("settings.forceCharLimit", function(responseData) {
			seymour.forceCharLimit = (responseData === 'true' ? true : false);
		});
	},

	getOption: function(option, callback) {
		var specificOption = seymour.extension.getDomainOption(option);

		if (specificOption) {
			callback(specificOption);
		} else {
			chrome.runtime.sendMessage({method: "getLocalStorage", key: "store."+option}, (function() {
				return function(response) {
					if (response && response.data) {
						callback(response.data);
					}
				};
			})(callback));
		}
	},

	getDomainOption: function(option) {
		var value = localStorage["seymour."+option];
		return value;
	},

	setDomainOption: function(option, value) {
		localStorage.setItem("seymour."+option, value);
	},

	setActiveStateIcon: function(state) {
		chrome.runtime.sendMessage({method: "setPageActionIcon", state: state});
	}
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	switch (request.action) {
		case "handshake":
		{
			sendResponse('ack');
		}
		break;

		case "activate":
		{
			seymour.activate();
			sendResponse('active');
		}
		break;

		case "deactivate":
		{
			seymour.deactivate();
			sendResponse('inactive');
		}
		break;
		
		case "getOptions":
		{
			var tabOptions = {};
			tabOptions.charLimit = (localStorage["seymour.settings.charLimit"] ? localStorage["seymour.settings.charLimit"] : seymour.charLimit);
			tabOptions.forceCharLimit = (localStorage["seymour.settings.forceCharLimit"] ? localStorage["seymour.settings.forceCharLimit"] : seymour.forceCharLimit);
    		sendResponse(tabOptions);
		}
		break;
		
		case "setOptions":
		{
			localStorage.setItem("seymour.settings."+request.key, request.value);
			sendResponse({option: request.key, value: request.value});
		}
		break;
		
		case "getActiveFlag":
		{
			sendResponse(seymour.activeFlag);
		}
		break;
		
		case "setActiveFlag":
		{
			seymour.activeFlag = (request.state === 'true' ? true : false);
		}
		break;
	}
});

seymour.iconDefaultURL = chrome.runtime.getURL("icons/icon12.png");

var css = '.seymour-counter { background-image: url('+seymour.iconDefaultURL+'); }',
    head = document.head,
    style = document.createElement('style');

style.type = 'text/css';
if (style.styleSheet){
  style.styleSheet.cssText = css;
} else {
  style.appendChild(document.createTextNode(css));
}
head.appendChild(style);

seymour.extension.updateOptions();

var shouldAutoActivate = (seymour.extension.getDomainOption('autoactivate') === 'true' ? true : false);
if (shouldAutoActivate) {
	seymour.activate();
} else {
	seymour.extension.setActiveStateIcon('inactive');
}