webix.protoUI({
	name:"forminput",
	defaults:{
		$cssName:"webix_forminput",
		labelWidth: 80,
		labelAlign : "left"
	},
	setValue:function(value){
		this._body_view.setValue(value);
	},
	focus:function(){
		this._body_view.focus();
	},
	getValue:function(){
		return this._body_view.getValue();
	},
	value_setter:function(value){
		this.setValue(value);
	},
	getBody:function(){
		return this._body_view;
	},
	$skin:function(){
		this._inputPadding = webix.skin.$active.inputPadding;
		this._inputSpacing = webix.skin.$active.inputSpacing;
	},
	$init:function(obj){
		this.$ready.push(function(){
			var label = this._viewobj.firstChild.childNodes[0];
			label.style.width = this._settings.paddingX+"px";
			label.style.textAlign = this._settings.labelAlign;
			if (!this._settings.labelWidth)
				label.style.display = "none";
		});

		var lw = webix.isUndefined(obj.labelWidth) ? this.defaults.labelWidth : obj.labelWidth;
		obj.paddingX = lw - this._inputPadding*2 + this._inputSpacing* 2;
	},
	setBottomText: function(text) {
		var config = this._settings;
		if (typeof text != "undefined"){
			if (config.bottomLabel == text) return;
			config.bottomLabel = text;
		}
		var message = (config.invalid ? config.invalidMessage : "") || config.bottomLabel;
		if(this._invalidMessage) {
			webix.html.remove(this._invalidMessage);
		}
		if(message) {
			this.$view.style.position = "relative";
			this._invalidMessage = webix.html.create("div", { class:"webix_inp_bottom_label", role:config.invalid?'alert':"", "aria-relevant":'all', style:"position:absolute; bottom:0px; padding:2px; background: white; left:"+this._settings.labelWidth+"px; " }, message);
			this._viewobj.appendChild(this._invalidMessage);
		}
	}
}, webix.ui.fieldset);
