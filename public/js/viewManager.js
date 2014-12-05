(function(window, document, $, _app, undefined){

var
/******************************************Private****************************************/
SCREEN_TRANSITION_DURATION = 500,

_activeView,

buildClass = function(options){
	this.parent = options.parent;
	this.initialize();
};

/******************************************Class****************************************/
var ViewManager = function(options){
	buildClass.apply(this, arguments);
};

/******************************************Public****************************************/
ViewManager.prototype = {
	constructor: ViewManager,
	initialize: function(){
		_app.log("View Manager initialized", "VIEWMANAGER");
	},
	showView: function(id){
		if(typeof _activeView !== "undefined"){
			this.hideView();
		}

		_activeView = new _app.Views[id]();

		_activeView.render();
	},
	hideView: function(){
		_activeView.hide();
		_activeView = null;
	}

};

_app.Classes.ViewManager = ViewManager;
	
}(this, document, jQuery, QuickChat));