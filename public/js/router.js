(function(window, document, $, _app, undefined){

var _viewManager;


/******************************************Class****************************************/
var router = Backbone.Router.extend({
	initialize: function(options){
		_app.log("Router initialized", "ROUTER");

		_viewManager = new _app.Classes.ViewManager({parent: this});

		this.parent = options.parent;
	},
	routes: {
		"login": "loginScreen",
		"chat": "chatScreen"
	},
	loginScreen: function(){

		if (_app.SocketManager.hasJoinedChat() === true) {
			_app.goToChat();
			return;
		}

		_app.log("navigating to loading screen", "ROUTER");
		_app.setTitle("Please login!!");
		_viewManager.showView("Login");
	},
	chatScreen: function(){

		if (_app.SocketManager.hasJoinedChat() === false) {
			_app.goToChat();
			return;
		}

		_app.log("navigating to chat screen", "ROUTER");
		_app.setTitle("Chat--"+_app.userModel.name);
		_viewManager.showView("Chat");
	}

});


// sharing
_app.Modules.Router = router;

}(this, document, jQuery, QuickChat));