const {interfaces: Ci,	utils: Cu,	classes: Cc} = Components;
const self = {
	name: 'Zoomr',
	aData: 0,
};

var myServices = {};
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyGetter(myServices, 'as', function () {
	return Cc["@mozilla.org/alerts-service;1"].getService(Ci.nsIAlertsService)
});

var lastOutlined = null; //holds el
var timeout = null;
var timeoutWin;
var trigger = 0;

function outlineHelper(e) {

	if (!e.shiftKey || !e.ctrlKey) {
		return;
	}

	var win = e.originalTarget.ownerDocument.defaultView;
	win.removeEventListener('mousemove', moved, true);
	win.removeEventListener('dragstart', dragstarted, true);

	var elWin = e.originalTarget.ownerDocument.defaultView;
	var win = elWin.top;

	var el = {
		target: {
			el: e.originalTarget,
		},
		parent: {
			el: e.originalTarget,
		},
		doc: {
			el: win.document.documentElement,
		}
	};

	var cScale = el.doc.el.style.transform.match(/\d+\.\d+/);
	cScale = cScale ? parseFloat(cScale) : 1;
	if (cScale != 1) {

		myServices.as.showAlertNotification(self.aData.resourceURI.asciiSpec + 'icon.png', 'DblTabZoom - Outline Fail', 'Already zoomed in');
		return;
	}
	if (!el.parent.el) {
		if (cScale != 1) {
			//zooming out
			el.parent.el = el.target.el;
		} else {

			return;
		}
	} else {
		for (var r = 0; r < 1; r++) {
			while (el.parent.el && el.parent.el.ownerDocument.defaultView.getComputedStyle(el.parent.el, null).display == 'inline') {
				el.parent.el = el.parent.el.parentNode;
			}

			for (var e in el) {
				el[e].rect = el[e].el.getBoundingClientRect();
			}
			scaleBy = el.doc.rect.width / el.parent.rect.width;
			if (scaleBy > scaleMax) {
				//el.parent.el = el.parent.el.parentNode;
				//r = -1;

			}
		}

		if (scaleBy < scaleMin) {

			myServices.as.showAlertNotification(self.aData.resourceURI.asciiSpec + 'icon.png', 'DblTabZoom - Failed Zoom', 'scaleBy < scaleMin so not scalling. scaleBy = ' + scaleMin);
			return;
		}
	}

	for (var e in el) {
		el[e].rect = el[e].el.getBoundingClientRect();
	}

	var zEl = null; //zoomEl decide which el to zoom, el or elP
	var gEl = null; //guidEl decide which el to use for guiding scroll bars

	//consider zooming parent if target == parent. then on second click zoom target
	if (cScale == 1) {

		zEl = 'parent';
		gEl = 'target';
	} else if (cScale != 1) {

		zEl = 'doc';
		gEl = 'target';
	} else {
		('Zoomr :: ', 'zoom parent');
		zEl = 'parent';
		gEl = 'target';
	}

	boxit(el[zEl].el);
}

function boxit(el) {

	var win = el.ownerDocument.defaultView.top;
	var doc = win.document;

	var rect = el.getBoundingClientRect();
	var can = doc.querySelector('#dbltapzcan');
	if (!can) {
		can = doc.createElement('canvas');
		//alert(doc.documentElement.innerHTML);
		doc.documentElement.appendChild(can);
	}
	can.style.pointerEvents = 'none';
	can.style.outline = '10px solid red';
	can.style.width = rect.width + 'px';
	can.style.height = rect.height + 'px';
	can.style.left = (rect.left + win.pageXOffset) + 'px';
	can.style.top = (rect.top + win.pageYOffset) + 'px';
	can.style.position = 'absolute';
	can.setAttribute('id', 'dbltapzcan');
}

var added = false;

function keyDowned(e) {
	if (added) {
		return
	}
	if (timeout) {

		var win = e.originalTarget.ownerDocument.defaultView;
		timeoutWin.clearTimeout(timeout);
		timeout = null;
		win.removeEventListener('mousemove', moved, true);
		win.removeEventListener('dragstart', dragstarted, true);
	}
	if (e.shiftKey && e.ctrlKey) {
		added = true;
		var DOMWindow = e.target.ownerDocument.defaultView.QueryInterface(Ci.nsIInterfaceRequestor)
			.getInterface(Ci.nsIWebNavigation)
			.QueryInterface(Ci.nsIDocShellTreeItem)
			.rootTreeItem
			.QueryInterface(Ci.nsIInterfaceRequestor)
			.getInterface(Ci.nsIDOMWindow);
		if (DOMWindow.gBrowser) {
			DOMWindow.gBrowser.addEventListener('mouseover', outlineHelper, true);
		} else {
			DOMWindow.gBrowser.addEventListener('mouseover', outlineHelper, true);
		}

		//use ctypes to get coords and then elem from point and then outlineHelper that
	}
}

function keyUpped(e) {
	if (timeout) {

		var win = e.originalTarget.ownerDocument.defaultView;
		timeoutWin.clearTimeout(timeout);
		timeout = null;
		win.removeEventListener('mousemove', moved, true);
		win.removeEventListener('dragstart', dragstarted, true);
	}
	if (e.shiftKey || e.ctrlKey) {

		var DOMWindow = e.target.ownerDocument.defaultView.QueryInterface(Ci.nsIInterfaceRequestor)
			.getInterface(Ci.nsIWebNavigation)
			.QueryInterface(Ci.nsIDocShellTreeItem)
			.rootTreeItem
			.QueryInterface(Ci.nsIInterfaceRequestor)
			.getInterface(Ci.nsIDOMWindow);
		if (DOMWindow.gBrowser) {
			DOMWindow.gBrowser.removeEventListener('mouseover', outlineHelper, true);
		} else {
			DOMWindow.gBrowser.removeEventListener('mouseover', outlineHelper, true);
		}
		added = false;

		var win = e.originalTarget.ownerDocument.defaultView.top;
		var doc = win.document;

		var can = doc.querySelector('#dbltapzcan');
		if (can) {
			can.parentNode.removeChild(can);
		}

	}
}

function moved(e) {
	var cX = e.clientX;
	var cY = e.clientY;
	var diffX = Math.abs(initX - cX);
	var diffY = Math.abs(initY - cY);
	if (diffX < 3 && diffY < 3) {

		return;
	}

	var win = e.originalTarget.ownerDocument.defaultView;
	win.removeEventListener('mousemove', moved, true);
	win.removeEventListener('dragstarted', dragstarted, true);
	timeoutWin.clearTimeout(timeout);
	timeout = null;
	//moved mouse so they are doing selecting/highlighting so cancel listening to the hold
}

function dragstarted(e) {

	var win = e.originalTarget.ownerDocument.defaultView;
	win.removeEventListener('dragstarted', dragstarted, true);
	win.removeEventListener('mousemove', moved, true);
	timeoutWin.clearTimeout(timeout);
	timeout = null;
	//moved mouse so they are doing selecting/highlighting so cancel listening to the hold
}

var zoomed = false;
var holdTime = 300;
var initX = 0; //on down records init coords
var initY = 0; //on down records init coords
var initScrollX = 0; //pre zoom scroll bars
var initScrollY = 0; //pre zoom scroll bars
var moveTolerance = 3; //on move if movement exceeds this px, uses init coords, then clear listen for hold

function downed(e) {
	if (!timeout && e.button != trigger) {
		return;
	}
	if (timeout && e.button != trigger) {
		if (timeout) { //this is redundant if but i copied pasted from other preventers in like wheeled etc this so leaving for consistency

			var win = e.originalTarget.ownerDocument.defaultView;
			timeoutWin.clearTimeout(timeout);
			timeout = null;
			win.removeEventListener('mousemove', moved, true);
			win.removeEventListener('dragstart', dragstarted, true);
		}
		return;
	}

	zoomed = false;

	//start - test to see if user is on scroll bar or find bar
	if (Object.prototype.toString.call(e.view) == '[object ChromeWindow]') {
		//this works for findbar
		if (e.view.gBrowser) {

			return;
		}
	}
	/*
	//this doesnt work for anything
	try {
		var ownerDocument = e.originalTarget.ownerDocument;
	} catch (ex) {

		return;
	}
	*/
	if (e.originalTarget.namespaceURI == 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul') {
		//this works for scrollbar

		return;
	}
	//end - test to see if user is on scroll bar
	if (!e.shiftKey || !e.ctrlKey) {
		//do hold down thing
		var win = e.originalTarget.ownerDocument.defaultView;
		initX = e.clientX;
		initY = e.clientY;

		timeoutWin = win;
		timeout = win.setTimeout(function () {
			zoom(e)
		}, holdTime);
		win.addEventListener('mousemove', moved, true);
		win.addEventListener('dragstart', dragstarted, true);
		//end do hold down thing
		return;
	}
	zoom(e);

	e.stopPropagation();
	e.preventDefault();
	e.returnValue = false;
}

function upped(e) {
	if (e.button != trigger) {
		return;
	}
	if (e.relatedTarget && e.relatedTarget.nodeName == 'zoomr') {
		//if (e.relatedTarget == 'Zoomr::SynthMouseUp') {
		//if (e.clientX == 0 && e.clientY == 0) {
		//if x y 0 0 its synth, most likely
		//dont prev it

	} else if (zoomed) {

		e.stopPropagation();
		e.preventDefault();
		e.returnValue = false;
	} else {
		if (timeout) {

			var win = e.originalTarget.ownerDocument.defaultView;
			timeoutWin.clearTimeout(timeout);
			timeout = null;
			win.removeEventListener('mousemove', moved, true);
			win.removeEventListener('dragstart', dragstarted, true);
		} else {

		}
	}
}

function clicked(e) {
	if (e.button != trigger) {
		return;
	}
	if (e.relatedTarget && e.relatedTarget.nodeName == 'zoomr') {
		//if (e.relatedTarget == 'Zoomr::SynthMouseUp') {
		//if (e.clientX == 0 && e.clientY == 0) {
		//if x y 0 0 its synth, most likely
		//dont prev it

	} else if (zoomed) {

		e.stopPropagation();
		e.preventDefault();
		e.returnValue = false;
	}
}

function wheeled(e) {
	if (timeout) {

		var win = e.originalTarget.ownerDocument.defaultView;
		timeoutWin.clearTimeout(timeout);
		timeout = null;
		win.removeEventListener('mousemove', moved, true);
		win.removeEventListener('dragstart', dragstarted, true);
	}
}

var scaleMax = 2;
var scaleMin = 1;

function zoom(e) {


	zoomed = true;

	if (timeout) {
		var utils = timeoutWin.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);

		//utils.sendMouseEvent('mouseup',0,0,trigger,1,0);
		var mouseEvent = timeoutWin.document.createEvent('MouseEvents')
		var mouseEventParam = {
			type: 'mouseup',
			canBubble: true,
			cancelable: true,
			view: timeoutWin,
			detail: trigger,
			screenX: e.screenX,
			screenY: e.screenY,
			clientX: e.clientX,
			clientY: e.clientY,
			ctrlKey: false,
			altKey: false,
			shiftKey: false,
			metaKey: false,
			button: trigger,
			relatedTarget: timeoutWin.document.createElement('zoomr'),
		}

		mouseEvent.initMouseEvent(mouseEventParam.type, mouseEventParam.canBubble, mouseEventParam.cancelable, mouseEventParam.view, mouseEventParam.detail, mouseEventParam.screenX, mouseEventParam.screenY, mouseEventParam.clientX, mouseEventParam.clientY, mouseEventParam.ctrlKey, mouseEventParam.altKey, mouseEventParam.shiftKey, mouseEventParam.metaKey, mouseEventParam.button, mouseEventParam.relatedTarget);
		e.target.dispatchEvent(mouseEvent)

	}
	timeout = null;

	var win = e.originalTarget.ownerDocument.defaultView;
	win.removeEventListener('mousemove', moved, true);
	win.removeEventListener('dragstart', dragstarted, true);

	var elWin = e.originalTarget.ownerDocument.defaultView;
	var win = elWin.top;

	var el = {
		target: {
			el: e.originalTarget,
		},
		parent: {
			el: e.originalTarget,
		},
		doc: {
			el: win.document.documentElement,
		}
	};

	var cScale = el.doc.el.style.transform.match(/\d+\.\d+/);
	cScale = cScale ? parseFloat(cScale) : 1;


	if (!el.parent.el) {
		if (cScale != 1) {
			//zooming out
			el.parent.el = el.target.el;
		} else {

			return;
		}
	} else {
		for (var r = 0; r < 1; r++) {
			while (el.parent.el && el.parent.el.ownerDocument.defaultView.getComputedStyle(el.parent.el, null).display == 'inline') {
				el.parent.el = el.parent.el.parentNode;
			}

			for (var e in el) {
				if (e == 'doc') {
					//el[e].attr = el[e].el.getAttribute('dbltapzoom');
				}
				el[e].rect = el[e].el.getBoundingClientRect();
			}
			scaleBy = el.doc.rect.width / el.parent.rect.width;
			if (scaleBy > scaleMax) {
				//el.parent.el = el.parent.el.parentNode;
				//r = -1;

			}
		}

		if (scaleBy < scaleMin) {

			myServices.as.showAlertNotification(self.aData.resourceURI.asciiSpec + 'icon.png', 'DblTabZoom - Failed Zoom', 'scaleBy < scaleMin so not scalling. scaleBy = ' + scaleMin);
			return;
		}
	}

	var zEl = null; //zoomEl decide which el to zoom, el or elP
	var gEl = null; //guidEl decide which el to use for guiding scroll bars

	//consider zooming parent if target == parent. then on second click zoom target
	if (cScale == 1) {

		zEl = 'parent';
		gEl = 'target';
	} else if (cScale != 1) {

		zEl = 'doc';
		gEl = 'target';
	} else {
		('Zoomr :: ', 'zoom parent');
		zEl = 'parent';
		gEl = 'target';
	}

	scaleBy = el.doc.rect.width / el[zEl].rect.width;
	scaleBy = scaleBy.toPrecision(3);
	//var str = ['scaleBy: ' + scaleBy, 'cScale: ' + cScale];
	//alert(str.join('\n'));


	if (scaleBy == 1 && zEl == 'parent') {

		/*
        zEl = 'target';
        gEl = 'target';
        scaleBy = el.doc.rect.width / el[zEl].rect.width;
        scaleBy = scaleBy.toPrecision(3);
        */
	}

	if (scaleBy != 1 && scaleBy == cScale) {

		zEl = 'doc';
		gEl = 'target';
		scaleBy = 1;
	}

	if (zEl != 'doc') { //shud probably do this setting of attribute after the removing of attributes from old els as else might overlap between old and current/new
		//el[gEl].el.setAttribute('dbltapzoom','2');
		//el[zEl].el.setAttribute('dbltapzoom','1'); //must do this 2nd as if gEl == zEl we want to ensure that zEl is set to 1 as that is very important in if logic above
	}




	el.doc.el.style.transform = 'scale(' + scaleBy + ',' + scaleBy + ')';
	el.doc.el.style.transformOrigin = 'top left';

	el[zEl].rect = el[zEl].el.getBoundingClientRect();
	el[gEl].rect = el[gEl].el.getBoundingClientRect(); //update el rect as it was transformed

	//e.originalTarget.scrollIntoView(true);
	//alert(el.offsetLeft*zoomScale + '\n' + gBrowser.contentWindow.scrollX);
	var str = ['scaleBy: ' + scaleBy, 'zEl nodename:' + el[zEl].el.nodeName, 'gEl nodename:' + el[gEl].el.nodeName, 'el[gEl].rect.left: ' + el[gEl].rect.left, 'el[gEl].rect.top: ' + el[gEl].rect.top, 'win.pageXOffset: ' + win.pageXOffset, 'win.pageYOffset: ' + win.pageYOffset];
	var scrollToX = el[zEl].rect.left + win.pageXOffset;
	var scrollToY = el[gEl].rect.top + win.pageYOffset;
	/*//not sure if i need this block, test it by zooming in on element in frame and see if the scroll bars of top win line up perfectly with the zoomed el
    var cWin = elWin;
    while (cWin != win) {
        scrollToX += cWin.pageXOffset;
        scrollToY += cWin.paygeYOffset;
    }
    */
	win.scrollTo(scrollToX, scrollToY);


	if (scaleBy == 1) {
		myServices.as.showAlertNotification(self.aData.resourceURI.asciiSpec + 'icon.png', 'DblTabZoom - Zoomed Out', 'Content zoomed back to 1');
	} else {
		myServices.as.showAlertNotification(self.aData.resourceURI.asciiSpec + 'icon.png', 'DblTabZoom - Zoomed', 'Content zoomed to ' + scaleBy);
	}

}

/*start - windowlistener*/
var windowListener = {
	//DO NOT EDIT HERE
	onOpenWindow: function (aXULWindow) {
		// Wait for the window to finish loading
		let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
		aDOMWindow.addEventListener("load", function () {
			aDOMWindow.removeEventListener("load", arguments.callee, false);
			windowListener.loadIntoWindow(aDOMWindow, aXULWindow);
		}, false);
	},
	onCloseWindow: function (aXULWindow) {},
	onWindowTitleChange: function (aXULWindow, aNewTitle) {},
	register: function () {
		// Load into any existing windows
		let XULWindows = Services.wm.getXULWindowEnumerator(null);
		while (XULWindows.hasMoreElements()) {
			let aXULWindow = XULWindows.getNext();
			let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
			windowListener.loadIntoWindow(aDOMWindow, aXULWindow);
		}
		// Listen to new windows
		Services.wm.addListener(windowListener);
	},
	unregister: function () {
		// Unload from any existing windows
		let XULWindows = Services.wm.getXULWindowEnumerator(null);
		while (XULWindows.hasMoreElements()) {
			let aXULWindow = XULWindows.getNext();
			let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
			windowListener.unloadFromWindow(aDOMWindow, aXULWindow);
		}
		//Stop listening so future added windows dont get this attached
		Services.wm.removeListener(windowListener);
	},
	//END - DO NOT EDIT HERE
	loadIntoWindow: function (aDOMWindow, aXULWindow) {
		if (!aDOMWindow) {
			return;
		}
		if (aDOMWindow.gBrowser) {
			aDOMWindow.gBrowser.addEventListener('keydown', keyDowned, true);
			aDOMWindow.gBrowser.addEventListener('keyup', keyUpped, true);
			aDOMWindow.gBrowser.addEventListener('mousedown', downed, true);
			aDOMWindow.gBrowser.addEventListener('mouseup', upped, true);
			aDOMWindow.gBrowser.addEventListener('click', clicked, true);
			aDOMWindow.gBrowser.addEventListener('DOMMouseScroll', wheeled, true);

		} else {
			aDOMWindow.addEventListener('keydown', keyDowned, true);
			aDOMWindow.addEventListener('keyup', keyUpped, true);
			aDOMWindow.addEventListener('mousedown', downed, true);
			aDOMWindow.addEventListener('mouseup', upped, true);
			aDOMWindow.addEventListener('click', clicked, true);
			aDOMWindow.addEventListener('DOMMouseScroll', wheeled, true);
		}
	},
	unloadFromWindow: function (aDOMWindow, aXULWindow) {
		if (!aDOMWindow) {
			return;
		}
		if (aDOMWindow.gBrowser) {
			aDOMWindow.gBrowser.removeEventListener('keydown', keyDowned, true);
			aDOMWindow.gBrowser.removeEventListener('keyup', keyUpped, true);
			aDOMWindow.gBrowser.removeEventListener('mousedown', downed, true);
			aDOMWindow.gBrowser.removeEventListener('mouseup', upped, true);
			aDOMWindow.gBrowser.removeEventListener('click', clicked, true);
			aDOMWindow.gBrowser.removeEventListener('DOMMouseScroll', wheeled, true);
		} else {
			aDOMWindow.removeEventListener('keydown', keyDowned, true);
			aDOMWindow.removeEventListener('keyup', keyUpped, true);
			aDOMWindow.removeEventListener('mousedown', downed, true);
			aDOMWindow.removeEventListener('mouseup', upped, true);
			aDOMWindow.removeEventListener('click', clicked, true);
			aDOMWindow.removeEventListener('DOMMouseScroll', wheeled, true);
		}
	}
};
/*end - windowlistener*/
function startup(aData, aReason) {
	self.aData = aData; //must go first, because functions in loadIntoWindow use self.aData
	windowListener.register();
}

function shutdown(aData, aReason) {
	if (aReason == APP_SHUTDOWN) return;
	windowListener.unregister();
}

function install() {}

function uninstall() {}