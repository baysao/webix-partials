
webix.protoUI({
	name:"sidemenu",
	defaults: {
		animate: true,
		position: "left",
		width: 200,
		borderless: true
	},
	$init:function(){
		this.$view.className += " webix_sidemenu";
	},
	$skin:function(){
		this.defaults.padding = 0;
	},
	position_setter: function(value){
		var prevPosition = this._settings.position;
		if(prevPosition)
			webix.html.removeCss(this.$view," webix_sidemenu_"+prevPosition);
		webix.html.addCss(this.$view," webix_sidemenu_"+value);
		return value;
	},
	$getSize: function(){
		var sizes = webix.ui.window.prototype.$getSize.apply(this,arguments);
		this._desired_sizes = sizes;
		return sizes;
	},
	$setSize:function(x,y){
		webix.ui.view.prototype.$setSize.call(this,x,y);
		x = this._content_width-this._settings.padding*2;
		y = this._content_height-this._settings.padding*2;
		this._contentobj.style.padding = this._settings.padding+"px";
		this._headobj.style.display="none";
		this._bodyobj.style.height = y+"px";
		this._body_cell.$setSize(x,y);
	},
	show: function(){
		if(!this.callEvent("onBeforeShow",arguments))
			return false;

		this._settings.hidden = false;
		this._viewobj.style.zIndex = (this._settings.zIndex||webix.ui.zIndex());
		if (this._settings.modal || this._modal){
			this._modal_set(true);
			this._modal = null; // hidden_setter handling
		}
		this._viewobj.style.display = "block";
		this._render_hidden_views();
		if (this._settings.position)
			this._setPosition();

		this._hide_timer = 1;
		webix.delay(function(){ this._hide_timer = 0; }, this, [], (webix.env.touch ? 400 : 100 ));

		if (this.config.autofocus){
			this._prev_focus = webix.UIManager.getFocus();
			webix.UIManager.setFocus(this);
		}

		if (-1 == webix.ui._popups.find(this))
			webix.ui._popups.push(this);

		this.callEvent("onShow",[]);
	},
	_setPosition: function(x){
		var width, height, maxWidth, maxHeight,
			position,
			left = 0, top = 0,
			state = { };


		this.$view.style.position = "fixed";

		maxWidth = (window.innerWidth||document.documentElement.offsetWidth);
		maxHeight = (window.innerHeight||document.documentElement.offsetHeight);

		width = this._desired_sizes[0] || maxWidth;
		height = this._desired_sizes[2] ||maxHeight;

		webix.assert(width &&height, "Attempt to show not rendered window");

		position = this._settings.position;

		if(position == "top"){
			width = maxWidth;
		} else if(position == "right"){
			height = maxHeight;
			left = maxWidth - width;
		} else if(position == "bottom"){
			width = maxWidth;
			top = maxHeight - height;
		} else {
			height = maxHeight;
		}

		state = { left: left, top: top,
			width: width, height: height,
			maxWidth: maxWidth, maxHeight: maxHeight
		};

		if (typeof this._settings.state == "function")
			this._settings.state.call(this, state);

		this._state = state;

		this.$setSize(state.width, state.height);

		if (typeof x == "undefined" && this._isAnimationSupported()){
			webix.html.removeCss(this.$view,"webix_animate",true);
			// set initial state
			this._animate[this._settings.position].beforeShow.call(this, state);
			// set apply animation css
			webix.delay(function(){
				webix.html.addCss(this.$view,"webix_animate",true);
			},this, null,1);
			// animate popup
			webix.delay(function(){
				this._animate[this._settings.position].show.call(this, state);
			},this, null,10);

		}
		else{

			this.setPosition(state.left, state.top);
		}
	},
	_isAnimationSupported: function(){
		return webix.animate.isSupported() && this._settings.animate && !(webix.env.isIE && navigator.appVersion.indexOf("MSIE 9")!=-1);
	},
	hidden_setter:function(value){
		if(value)
			this.hide(true);
		else
			this.show();
		return !!value;
	},
	_animate:{
		left: {
			beforeShow: function(state){
				this.$view.style.left = -state.width+"px";
				this.$view.style.top = state.top+"px";
			},
			show: function(){
				this.$view.style.left = "0px";
			},
			hide: function(state){
				this.$view.style.left = -state.width+"px";
			}
		},
		right: {
			beforeShow: function(state){
				this.$view.style.left = "auto";
				this.$view.style.right = -state.width+"px";
				this.$view.style.top = state.top+"px";
			},
			show: function(){
				this.$view.style.right = 0 +"px";
			},
			hide: function(state){
				this.$view.style.right = -state.width+"px";
			}
		},
		top: {
			beforeShow: function(state){
				this.setPosition(state.left,state.top);
				this.$view.style.height ="0px";
				this._bodyobj.style.height ="0px";
			},
			show: function(state){
				this.$view.style.height = state.height +"px";
				this._bodyobj.style.height =state.height+"px";
			},
			hide: function(){
				this.$view.style.height = "0px";
				this._bodyobj.style.height = "0px";
			}
		},
		bottom: {
			beforeShow: function(state){
				this.$view.style.left = state.left + "px";
				this.$view.style.top = "auto";
				var bottom = (state.bottom != webix.undefined?state.bottom:(state.maxHeight-state.top  -state.height));
				this.$view.style.bottom = bottom +"px";
				this.$view.style.height ="0px";
			},
			show: function(state){
				this.$view.style.height = state.height +"px";
			},
			hide: function(){
				this.$view.style.height = "0px";
			}
		}
	},
	hide:function(force){

		if (this.$destructed) return;

		if (this._settings.modal)
			this._modal_set(false);

		var maxWidth = (window.innerWidth||document.documentElement.offsetWidth);
		var maxHeight = (window.innerHeight||document.documentElement.offsetHeight);

		if (!force && this._isAnimationSupported() && maxWidth == this._state.maxWidth && maxHeight == this._state.maxHeight){
			// call 'hide' animation handler
			this._animate[this._settings.position].hide.call(this, this._state);
			// hide popup
			var tid = webix.event(this.$view, webix.env.transitionEnd, webix.bind(function(ev){
				this._hide_callback();
				webix.eventRemove(tid);
			},this));
		}
		else{
			this._hide_callback();
		}

		if (this._settings.autofocus){
			var el = document.activeElement;
			if (el && this._viewobj && this._viewobj.contains(el)){
				webix.UIManager.setFocus(this._prev_focus);
				this._prev_focus = null;
			}
		}

		this._hide_sub_popups();

	}

}, webix.ui.popup);