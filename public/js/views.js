(function(window, document, $, _app, undefined){

var 
/******************************************Private****************************************/
ACTIVE_SCREEN_CLASS = "on",
SHOW_SCREEN_ANIMATION_DURATION = 500,
MIN_DELAY = 100,
_views = {};

// base Class
var BaseClass = Backbone.View.extend({
	hide: function(){
		var self = this;

		this.$el.removeClass(ACTIVE_SCREEN_CLASS);

		_.delay(function(){self.destroy(); self = null; },SHOW_SCREEN_ANIMATION_DURATION);
		
	},
	destroy: function(){
		console.log("DESTROY", this.name);
		if (this.onDestroy) this.onDestroy();

		this.undelegateEvents();
		this.$el.removeData().unbind();
		this.remove(); 
    	Backbone.View.prototype.remove.call(this);

    	this.el = null;
    	this.$el = null;

    	this.parentEl = null;
    	delete this.parentEl;
    },
    getTemplate: function(name, params){
    	params = params || {};
    	this.template = _.template(_app.getTemplate(name))(params);
		this.reloadElement();
    },
    reloadElement: function(){
    	this.$el.html(this.template);
    }
});

// animatedScreen Class
var AnimatedScreen = BaseClass.extend({
	render: function(){

		var self = this;

		this.parentEl.append(this.$el);

		_.delay(function(){
			self.$el.addClass(ACTIVE_SCREEN_CLASS);
			self.calculateRenderCompletion();
			self = null;
		}, MIN_DELAY);

	},
	calculateRenderCompletion: function(){

		var self = this;

		_.delay(function(){
			if (self.onRenderComplete) self.onRenderComplete();
			self = null;
		}, SHOW_SCREEN_ANIMATION_DURATION);
	},
	onRenderComplete: function(){
		_app.log("rendered "+this.name, "VIEWS");
	},
	unrender: function(){

	}
});

/******************************************Public****************************************/

// LOGIN
_views.Login = AnimatedScreen.extend({
	parentEl: $("#mainView"),
	name: "loginScreen",
	tag: "section",
	className: "screen",
	id: "LoginView",
	initialize: function(){
		_app.Dialog.hide();
		this.getTemplate("Login");

		this.button = $("#login", this.el);
		this.input = $("input", this.$el)
		_app.Events.on(_app.socketEvents.JOIN_SUCCESS, this.onJoinedChat, this);
		_app.Events.on(_app.socketEvents.JOIN_DENIED, this.onJoinDenied, this);
	},
	events: {
		"click #login": "startLoginProcess",
		"keydown input": "keyTapped"
	},
	startLoginProcess: function(){
			var name = this.input.val().trim();

		// input validation
		if (name.length < 4) {
			alert("please enter more than 4 characters");
			return;
		}


		_app.Dialog.show("Entering chat...");
		_app.SocketManager.joinChat({name: name});
		this.name = name;
		this.button.attr("disabled", "disabled");

		input = null;
		
	},
	keyTapped: function(evt){
		if (evt.keyCode == 13) {
            this.startLoginProcess();
        }
	},
	onJoinedChat: function(){
		_app.userModel.name = this.name;
		_app.goToChat();
	},
	onJoinDenied: function(params){
		this.button.removeAttr("disabled");
		_app.Dialog.hide();
		alert(params);
	},
	onDestroy: function(){
		_app.Events.off(_app.socketEvents.JOIN_SUCCESS, this.onJoinedChat, this);
		_app.Events.off(_app.socketEvents.JOIN_DENIED, this.onJoinDenied, this);
	}
	
});

// CHAT VIEW
_views.Chat = AnimatedScreen.extend({
	parentEl: $("#mainView"),
	name: "chatScreen",
	tag: "section",
	className: "screen",
	id: "ChatView",
	initialize: function(){
		console.log("[DEBUG]: INIT CHAT VIEW");

		_app.Dialog.hide();

		_.bindAll(this, "logoutClicked", "sendMessageTapped", "keyTapped");

		// get template
		this.getTemplate("Chat", {name: _app.userModel.name});

		//create user List
		this.createChildren();

		this.button = $("#logoutBtn", this.el);
		this.message = $("input", this.el);

		_app.Events.on(_app.socketEvents.DISJOIN_SUCCESS, this.logoutSuccess, this);
		_app.SocketManager.getUserList();
		_app.Events.on(_app.socketEvents.USERLIST_SUCCESS, this.updateModel, this);
		_app.Events.on(_app.socketEvents.OTHER_USER_JOINED, this.updateModel, this);
		_app.Events.on(_app.socketEvents.OTHER_USER_REJOINED, this.updateModel, this);
		_app.Events.on(_app.socketEvents.OTHER_USER_DISCONNECT, this.updateModel, this);
		_app.Events.on(_app.socketEvents.OTHER_USER_LEFT, this.updateModel, this);
		_app.Events.on(_app.socketEvents.CHAT_MESSAGE_BROADCAST, this.messageReceived, this);

	},
	events:{
		"click #logoutBtn": "logoutClicked",
		"click #sendMessage": "sendMessageTapped",
		"keydown input": "keyTapped"
	},
	keyTapped: function(evt){
		if (evt.keyCode == 13) {
            this.sendMessageTapped();
        }
	},
	messageReceived: function(params){
		this.chatFeed.append(("<span>["+params.name+"]: </span>"+params.msg), "not_me chatMessage");
	},
	sendMessageTapped: function(){
		var msg = this.message.val();

		if (msg.length === 0) return;

		this.message.val("");
		_app.SocketManager.sendMessage({msg: msg, name: _app.userModel.name});
		this.chatFeed.append(("<span>[Me]: </span>"+msg), "me chatMessage");
	},
	logoutSuccess: function(){
		_app.goToLogin();
	},
	logoutClicked: function(){
		this.button.attr("disabled", "disabled");
		_app.Dialog.show("Logging out...");
		_app.logout();
	},
	createChildren: function(){
		var userListModel = Backbone.Model.extend({ users: undefined });

		var parent = $(".chatContainer", this.el);

		this.chatUserList = new _app.Views.ChatList({model: new userListModel({ users: []}), parentEl: parent});
		this.chatFeed = new _app.Views.ChatFeed({ parentEl: parent });
	},
	updateModel: function(params){
		if (typeof params.type !== "undefined") {
			this.postMessage(params);
		}

		this.chatUserList.updateModel(params.userList);
	},
	postMessage: function(params){
		var msg = "[System]: ", cls;

		switch(params.type){
			case "user_joined":
				msg += "<span>"+params.name+"</span> joined the chat!";
				cls = "green";
			break;

			case "user_re_joined":
				msg += "<span>"+params.name+"</span>  is back!";
				cls = "green";
			break;

			case "user_left":
				msg += "<span>"+params.name+"</span>  left the room!";
				cls = "red";
			break;

			case "user_disconnected":
				msg += "<span>"+params.name+"</span>  disconnected!";
				cls = "red";
			break;
		}
		
		cls += " system_message";

		this.chatFeed.append(msg, cls);

	},

	onDestroy: function(){

		this.button = null;
		this.message = null;
		this.sendMessageBtn = null;

		this.chatUserList.hide();
		this.chatFeed.hide();
		_app.Events.off(_app.socketEvents.DISJOIN_SUCCESS, this.logoutSuccess, this);
		_app.Events.off(_app.socketEvents.USERLIST_SUCCESS, this.updateModel, this);
		_app.Events.off(_app.socketEvents.OTHER_USER_JOINED, this.updateModel, this);
		_app.Events.off(_app.socketEvents.OTHER_USER_REJOINED, this.updateModel, this);
		_app.Events.off(_app.socketEvents.OTHER_USER_DISCONNECT, this.updateModel, this);
		_app.Events.off(_app.socketEvents.OTHER_USER_LEFT, this.updateModel, this);
	}
});


// chat feed
_views.ChatFeed = AnimatedScreen.extend({
	name: "chatFeed",
	tag: "section",
	id: "ChatFeed",
	className: "list_border col-xs-8",
	initialize: function(params){

		this.getTemplate("List", {header: "Chat Feed", message: "Welcome "+_app.userModel.name});
		this.parentEl = params.parentEl;
		this.render();

		this.listContainer = $(".listContainer", this.el);
		this.list = $(".list", this.el);

	},
	onDestroy: function(){
		this.parentEl = null;
	},
	append: function(msg, type){
		var el = '<p class="'+type+'">'+msg+'</p>';
		this.list.append(el);

		this.listContainer.scrollTop(this.list.height());
	}
});

// CHAT LIST
_views.ChatList = AnimatedScreen.extend({
	name: "chatUserList",
	tag: "section",
	id: "ChatUserList",
	className: "list_border col-xs-4",
	initialize: function(params){
		_.bindAll(this, "updateList");

		this.getTemplate("List", {header: "User List"});
		this.parentEl = params.parentEl;
		this.render();

		this.list = $(".list", this.el);
		this.model.on("change", this.updateList);

	},
	updateModel: function(list){
		this.model.set("users", list);

	},
	
	updateList: function(){
		var i, str = "", list = this.model.get("users");

		for(i=0; i<list.length; i++){
			str += '<p>'+(list[i])+'</p>';
		}
		this.list.html(str);
	},
	onDestroy: function(){
		this.parentEl = null;
		this.list = null;
		this.model.off("change", this.updateList);
	}
});

// sharing
_app.Views = _views;
	
}(this, document, jQuery, QuickChat));