(function(window, document, $, _app, undefined){

var 
_overlay,
_container,
_spinner,
_showing,
_self, 
_textContainer,

ANIMATION_DURATION = 200;


var BuildClass = function(){
	_overlay = $("#Dialog_Overlay");
	_container = document.querySelector("#dialogFrame");
	_textContainer = $("p", _overlay);

	_spinner = new Spinner({
	  lines: 13, // The number of lines to draw
	  length: 20, // The length of each line
	  width: 10, // The line thickness
	  radius: 30, // The radius of the inner circle
	  corners: 1, // Corner roundness (0..1)
	  rotate: 0, // The rotation offset
	  direction: 1, // 1: clockwise, -1: counterclockwise
	  color: '#000', // #rgb or #rrggbb or array of colors
	  speed: 1, // Rounds per second
	  trail: 60, // Afterglow percentage
	  shadow: false, // Whether to render a shadow
	  hwaccel: false, // Whether to use hardware acceleration
	  className: 'spinner', // The CSS class to assign to the spinner
	  zIndex: 2e9, // The z-index (defaults to 2000000000)
	  top: '50%', // Top position relative to parent
	  left: '50%' // Left position relative to parent
	});

};

var _dialog = function(){

	if (typeof _self === "undefined") {
		BuildClass.apply(this, arguments);
		this.show();
		_self = this;
	} 

	return _self;
};

_dialog.prototype = {
	constructor: _dialog,
	showTimer: undefined,
	hideTimer: undefined,
	show: function(strText){
		console.log("[DIALOG]: SHOWING");

		clearTimeout(this.hideTimer);
		_textContainer.text(strText);
		_spinner.spin(_container);
		_overlay.addClass("render");

		this.showTimer = _.delay(function(){
			_overlay.addClass("show");
		}, 0);
	},
	hide: function(){
		console.log("[DIALOG]: HIDING");

		clearTimeout(this.showTimer);

		_overlay.removeClass("show");

		this.hideTimer = _.delay(function(){
			_overlay.removeClass("render");
			_spinner.stop();
		}, ANIMATION_DURATION);
	}
};


_app.Dialog = new _dialog();
	
}(this, document, jQuery, QuickChat));