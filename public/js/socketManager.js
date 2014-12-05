(function(window, document, $, _app, undefined){

var
/****************************************** LOCAL ****************************************/
_manager = {},

_socket,
_isConnected,
_isReconnecting = false,
_alreadyInitialized = false,
_isFirstConnection = false,
_id = 0,
_registeredCallbacks = {},
_joinedChat = false,



// FN
setEssentialListeners = function(){

	_socket.on("message", function(){
		console.log("message", arguments);
	});

	_socket.on("connect", onConnectSuccess);
	_socket.on("connect_error", onConnectError);
	_socket.on("disconnect", onDisconnect);
	_socket.on("reconnect", onReconnectSuccess);
	_socket.on("reconnect_error", onReconnectError);
	_socket.on("connect_timeout", onTimeout);
	_socket.on("reconnecting", onReconnecting);
},

// socket callbacks
onConnectSuccess = function(){
	_app.log("connected to Socket", "SOCKET");
	_isConnected = true;
	_app.Dialog.hide();

	if (_isFirstConnection === false) {
		_isFirstConnection = true;
		_app.Events.trigger("socket_connect_initial");
	} else {
		_app.Events.trigger("socket_connect");
	}

},
onConnectError = function(){
	_app.log("error when connecting to Socket", "SOCKET");
	_isConnected = false;
	_app.Events.trigger("socket_connect_error");
},
onDisconnect = function(){
	_app.log("disconnected from Socket", "SOCKET");
	_app.Dialog.show("Reconnecting...");
	_isConnected = false;
	_joinedChat = false;
	_app.Events.trigger("socket_disconnected");
},
onReconnectSuccess = function(){
	_app.log("Re-connected to Socket", "SOCKET");
	_app.Dialog.hide();
	_isConnected = true;
	_isReconnecting = false;
	_app.Events.trigger("socket_connect");
	_manager.attemptRejoin();
},
onReconnectError = function(){
	_app.log("Error while reconnecting to Socket", "SOCKET");
	_isReconnecting = false;
	_isConnected = false;
},
onTimeout = function(){
	_app.log("Timeout when connecting to Socket", "SOCKET");
	_isConnected = false;
},
onReconnecting = function(){
	_app.log("Re-connecting to Socket...", "SOCKET");
	_isReconnecting = true;

},
// CHAT JOIN
onJoinSuccess = function(params){
	_app.log("Joined chat", "SOCKET");
	_joinedChat = true;
	_app.userModel.name = params.name;
	_app.userModel.activeSessionId = params.id;
	_app.save(params.id);
	_app.Events.trigger(_app.socketEvents.JOIN_SUCCESS);
},
onJoinDenied = function(params){
	_app.log("Join chat denied", "SOCKET");
	_joinedChat = false;
	_app.Events.trigger(_app.socketEvents.JOIN_DENIED, params);
},
onReJoinDenied = function(){
	_app.log("RE-Joined chat denied", "SOCKET");
	_app.deleteSave();
	_joinedChat = false;
	_app.goToLogin();
},
onReJoinSuccess = function(params){
	_app.log("RE-Joined chat success", "SOCKET");
	_joinedChat = true;
	_app.userModel.name = params.name;
	_app.goToChat();
},
onOtherUserJoined = function(params){
	if (_joinedChat !== true) return;
	console.log("new user joined", params);
	_app.Events.trigger(_app.socketEvents.OTHER_USER_JOINED, params);
},
onOtherUserReJoined = function(params){
	if (_joinedChat !== true) return;
	console.log("new user re-joined", params);
	_app.Events.trigger(_app.socketEvents.OTHER_USER_REJOINED, params);
},
onOtherUserDisconnect = function(params){
	if (_joinedChat !== true) return;
	console.log("new user disconnect", params);
	_app.Events.trigger(_app.socketEvents.OTHER_USER_DISCONNECT, params);
},
onOtherUserLeft = function(params){
	if (_joinedChat !== true) return;
	console.log("new user left", params);
	_app.Events.trigger(_app.socketEvents.OTHER_USER_LEFT, params);
},
onUserListSuccess = function(params){
	if (_joinedChat !== true) return;
	_app.Events.trigger(_app.socketEvents.USERLIST_SUCCESS, params);
},
onDisjoinSuccess = function(params){
	_joinedChat = false;
	_app.Events.trigger(_app.socketEvents.DISJOIN_SUCCESS, params);
	_app.deleteSave();
},
onChatBroadcastReceived = function(params){
	if (_joinedChat !== true) return;
	console.log("chat message received", params);
	_app.Events.trigger(_app.socketEvents.CHAT_MESSAGE_BROADCAST, params);
};

/****************************************** PUBLIC ****************************************/



_manager.initialize = function(){
	if (_alreadyInitialized === true) return;
	_alreadyInitialized = true;

	// init code...
	_app.log("connecting to Socket...", "SOCKET");
	_socket = io();

	setEssentialListeners();

	// other listeners
	_socket.on(_app.socketEvents.JOIN_SUCCESS, onJoinSuccess);
	_socket.on(_app.socketEvents.JOIN_DENIED, onJoinDenied);
	_socket.on(_app.socketEvents.REJOIN_DENIED, onReJoinDenied);
	_socket.on(_app.socketEvents.REJOIN_SUCCESS, onReJoinSuccess);
	_socket.on(_app.socketEvents.DISJOIN_SUCCESS, onDisjoinSuccess);
	_socket.on(_app.socketEvents.OTHER_USER_JOINED, onOtherUserJoined);
	_socket.on(_app.socketEvents.OTHER_USER_REJOINED, onOtherUserReJoined);
	_socket.on(_app.socketEvents.OTHER_USER_DISCONNECT, onOtherUserDisconnect);
	_socket.on(_app.socketEvents.OTHER_USER_LEFT, onOtherUserLeft);
	_socket.on(_app.socketEvents.USERLIST_SUCCESS, onUserListSuccess);
	_socket.on(_app.socketEvents.CHAT_MESSAGE_BROADCAST, onChatBroadcastReceived);
};

_manager.isConnected = function(){
	return _isConnected;
};

_manager.hasJoinedChat = function(){
	return _joinedChat;
};

_manager.joinChat = function(params){

	if (!params) _app.error("name param is required in order to join chat");


	if (_joinedChat === true) return;
	_socket.emit(_app.socketEvents.JOIN_REQUEST, params);
};

_manager.leaveChat = function(){
	if (_joinedChat === false) return;

	_socket.emit(_app.socketEvents.DISJOIN_REQUEST,{ token: _app.userModel.activeSessionId, name: _app.userModel.name });
};

_manager.attemptRejoin = function(){

	if (!_app.userModel.activeSessionId) _app.error("cookie not found");

	_socket.emit(_app.socketEvents.REJOIN_REQUEST, _app.userModel.activeSessionId);
};

_manager.getUserList = function(){
	_socket.emit(_app.socketEvents.USERLIST_REQUEST);
};

_manager.sendMessage = function(msg){
	_socket.emit(_app.socketEvents.CHAT_MESSAGE_REQUEST, msg);
};

_app.SocketManager = _manager;
	
}(this, document, jQuery, QuickChat));