var

//MAX USERS 20
/******************************************IMPORTS****************************************/
_express = require("express"),
_io = require("socket.io"),
_http = require("http"),
_uuid = require("node-uuid");


var
/******************************************VARS****************************************/
DEVELOPMENT_MODE = false,
_tokenMap = {},
_chatUsers = {},
_names = [],
_monitorUsersTimer,
_monitorUsersInterval = 5000,
_maxDisconnectTime = 1000000000,
_constants = {
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
	CHAT_MESSAGE_BROADCAST: "chat_message_broadcast",
};




/******************************************FN****************************************/
function log(msg){
	console.log("[LOG]: "+msg);
}

function debug(){

	var params = Array.prototype.slice.call(arguments);

	console.log("[DEBUG]: ",params);
}


//setting up components
var _App = _express();
var _Server = _http.Server(_App);
var _Socket = _io(_Server);



var
/******************************************************************************************
 * FUNCTIONS
******************************************************************************************/
removeFromNameList = function(strName){
	var nameIndex = _names.indexOf(strName);

	_names.splice(nameIndex, 1);
},
monitorUsers = function(){

	var user, absenceTime, key;


	for (key in _chatUsers){
		user = _chatUsers[key];

		if (user.isConnected === false) {

			absenceTime = Math.abs(user.disconnectTime - user.connectTime);

			// disconnected for more than 10 seconds
			if (absenceTime > _maxDisconnectTime) {
				removeFromNameList(user.name);
				delete _tokenMap[user.socketId];
				delete _chatUsers[key];
			} else {
				user.disconnectTime = new Date().getTime();
			}

		}
	}

	// console.log("before monitoring:", _chatUsers)
},
getUserList = function(){
	var arr = [],
		user, key;

	for(key in _chatUsers){
		 user = _chatUsers[key];

		 if (user.isConnected === true) {
		 	arr.push(user.name);
		 }
	}

	return arr;
};

/******************************************************************************************
 * EXPRESS
******************************************************************************************/

// make public folder public
_App.use('/public', _express.static(__dirname + '/public'));


// router
_App.get("/", function(req, res){

	var file = (DEVELOPMENT_MODE === false) ? "/client_prod.html" : "/client.html";

	res.sendFile(__dirname + file);
});

/******************************************************************************************
 * SOCKET
******************************************************************************************/


_Socket.on("connection", function(socket){
	log("client connected. id: "+ socket.id);

	/*********************************** JOIN CHAT *****************************************/
	socket.on(_constants.JOIN_REQUEST, function(params){

		var uuid, windowCount = 0;

		 // CONNECTING FOR THE FIRST TIME

		if (_names.indexOf(params.name) != -1) {
			log(params.name+" is already taken");
			socket.emit(_constants.JOIN_DENIED, "That name is already taken");
		} else {

			uuid = _uuid.v4();

			// store chat users
			_chatUsers[uuid] = {
				connectTime: new Date().getTime(),
				name: params.name,
				disconnectTime: 0,
				isConnected: true,
				socketId: socket.id,
				windowCount: ++windowCount
			};

			// store uuid and socket.id for later use
			_tokenMap[socket.id] = uuid;

			// add name to name list
			_names.push(params.name);


			socket.emit(_constants.JOIN_SUCCESS, {id: uuid, name: params.name});
			socket.broadcast.emit(_constants.OTHER_USER_JOINED, {userList: getUserList(), name: params.name, type: "user_joined"});
			log("user joined chat: "+params.name+"="+uuid);
		}
	});



	/*********************************** USERLIST REQUEST *****************************************/
	socket.on(_constants.USERLIST_REQUEST, function(){
		log("userList requested");
		socket.emit(_constants.USERLIST_SUCCESS, {userList: getUserList()});
	});



	/*********************************** RE-JOIN CHAT *****************************************/
	socket.on(_constants.REJOIN_REQUEST, function(params){
		var user = _chatUsers[params];

		if (user) {

			console.log("ATTEMPTING REJOIN", user);

			
			user.socketId = socket.id;
			_tokenMap[socket.id] = params;
			user.isConnected = true;
			++user.windowCount;

			log("USER WINDOW COTN: "+user.windowCount);

			socket.emit(_constants.REJOIN_SUCCESS, {name: user.name});

			if (user.windowCount === 1) {
				socket.broadcast.emit(_constants.OTHER_USER_REJOINED, {userList: getUserList(), name: user.name,type: "user_re_joined"});
			}

			

		} else {
			log("REJOIN_REQUEST-could not find user");
			socket.emit(_constants.REJOIN_DENIED);
		}
	});


	/*********************************** LEAVE CHAT *****************************************/
	socket.on(_constants.DISJOIN_REQUEST, function(params){
		var user = _chatUsers[params.token],
			nameIndex = _names.indexOf(params.name);

		_names.splice(nameIndex, 1);
		delete _tokenMap[params.socketId];
		delete _chatUsers[params.token];


		socket.broadcast.emit(_constants.OTHER_USER_LEFT, {userList: getUserList(), name: params.name, type:"user_left"});
		socket.emit(_constants.DISJOIN_SUCCESS, {userList: getUserList(), name: params.name});

		log("User left chat: "+params.name);

	});


	/*********************************** DISCONNECTED FROM SOCKET *****************************************/
	socket.on("disconnect", function(){

		var id = socket.id,
			token = _tokenMap[id],
			user = _chatUsers[token];

		if (!user) return;

		console.log("DISCONNECT", user);

		

		if (user.windowCount == 1) {
			user.isConnected = false;
			user.disconnectTime = new Date().getTime();
			delete _tokenMap[id];
			socket.broadcast.emit(_constants.OTHER_USER_DISCONNECT, {userList: getUserList(), name: user.name, type:"user_disconnected"});
		};
		--user.windowCount;
		
		
	});

	/*********************************** DISCONNECTED FROM SOCKET *****************************************/
	socket.on(_constants.CHAT_MESSAGE_REQUEST, function(params){
		socket.broadcast.emit(_constants.CHAT_MESSAGE_BROADCAST, params);
		log("sending messsage: "+params.msg);
	});

});

/******************************************************************************************
 * SERVER
******************************************************************************************/
_Server.listen(3001, function(){
	_monitorUsersTimer = setInterval(monitorUsers, _monitorUsersInterval);
	log("Listening to port 3001");
});