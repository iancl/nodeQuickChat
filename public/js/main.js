
var QuickChat = {};

(function(window, document, $, _app, io, undefined){

var
/******************************************Private****************************************/
_alreadyStarted = false,
_views,
_templates = {},
_viewManager,


buildClass = function(){
	_views = _app.Views;
	
	fetchTemplates();
	this.initialize();
	
},
fetchTemplates = function(){
	_app.log("Loading templates", "MAIN");
	$.ajax({
		url: "public/templates/templates.html",
		method: "GET",
		async: false,
		success: function(data){
			$(".template", $(data)).each(function(i, o){ _templates[o.id] = $(o).html(); });
		},
		error: function(){
			_app.error("Error loading templates");
		}
	});
	_app.log("Templates loaded", "MAIN");
};

/******************************************Class****************************************/
var Main = function(){
	buildClass.apply(this, arguments);
};

/******************************************Public****************************************/
Main.prototype = {
	constructor: Main,
	initialize: function(){

		// get stored Id if available
		_app.userModel.activeSessionId = _app.load();


		_app.SocketManager.initialize();

		// subscribe to events
		this.subscribeToEvents();
	},
	subscribeToEvents: function(){

		// when should attempt login
		_app.Events.on("socket_connect_initial", this.onInitialSocketConnection, this);
	},
	onInitialSocketConnection: function(){

		if (_app.userModel.activeSessionId !== false) {
			this.reJoinChat();
		} else {
			_app.goToLogin();
		}

	},
	reJoinChat: function(){
		_app.SocketManager.attemptRejoin();
	},
	onJoinSuccess: function(params){
		console.log("success");
	},
	onJoinDenied: function(params){
		console.log("error", params);
	}
};

_app.Classes = {};

_app.userModel = {
	activeSessionId: false,
	name: ""
};

_app.socketEvents = {
	JOIN_REQUEST: "join_request",
	REJOIN_REQUEST: "rejoin_request",
	REJOIN_SUCCESS: "rejoin_success",
	REJOIN_DENIED: "rejoin_DENIED",
	JOIN_DENIED: "join_denined",
	JOIN_SUCCESS: "join_success",
	DISJOIN_REQUEST: "disjoin_request",
	DISJOIN_SUCCESS: "disjoin_success",
	USERLIST_SUCCESS: "userlist_retrieved",
	USERLIST_ERROR: "userlist_not_retrieved",
	USERLIST_REQUEST: "userlist_request",
	OTHER_USER_JOINED: "other_user_joined",
	OTHER_USER_REJOINED: "other_user_rejoined",
	OTHER_USER_DISCONNECT: "other_user_disconnect",
	OTHER_USER_LEFT: "other_user_left",
	CHAT_MESSAGE_REQUEST: "chat_message_request",
	CHAT_MESSAGE_BROADCAST: "chat_message_broadcast"
};

_app.Events = _.extend({}, Backbone.Events);

// returns a template
_app.getTemplate = function(templateName){
	return _templates[templateName];
};

_app.setTitle = function(title){
	document.title = title;
};

// logs to console
_app.log = function(msg, id){

	id = id || "LOG";
	console.log("["+id+"]: "+msg);
};

// logs and throws error
_app.error = function(msg){
	console.log("[ERROR]: "+msg);
	throw new Error(msg); 
};

// router related
_app.enableRouter = function(){

	if (_alreadyStarted === true) return;
	_alreadyStarted = true;

	// instantiate components
	_app.Router = new _app.Classes.Router({parent: this});

	// Start history
    Backbone.history.start();
};

_app.goToLogin = function(){
	this.enableRouter();
	_app.Router.navigate("login", true);
};

_app.goToChat = function(){
	this.enableRouter();
	_app.Router.navigate("chat", true);
};

_app.logout = function(){
	_app.SocketManager.leaveChat();
};

// save/load related
_app.save = function(cvalue){

	var cname = "chatId";
	var exdays = 30;

	// assuming the perfect scenario 
	var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; " + expires;
};

_app.load = function(){

	var cname = "chatId";

	var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i<ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1);
        if (c.indexOf(name) != -1) return c.substring(name.length,c.length);
    }
    return false;
};

_app.deleteSave = function(){
	document.cookie = "chatId=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
};

// sharing
_app.main = Main;



function initChat(){
	new QuickChat.main();
}

$("document").ready(initChat);



}(this, document, jQuery, QuickChat, io));