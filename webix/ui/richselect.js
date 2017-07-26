webix.protoUI({
	name:"richselect",
	defaults:{
		template:function(obj,common){
			return common._render_div_block(obj, common);
		},
		popupWidth:200,
		icon: "angle-down"
	},
	_onBlur:function(){
		if (this._settings.text == this.getText() || (webix.isUndefined(this._settings.text) && !this.getText()))
			return;

		var suggest =  this.getPopup(),
			value = suggest.getSuggestion();

		if (value && !(this.getInputNode().value==="" && suggest.getItemText(value)!==""))
			this.setValue(value);
		else if(this._revertValue)
			this._revertValue();
	},
	suggest_setter:function(value){
		return this.options_setter(value);
	},
	options_setter:function(value){
		value = this._suggest_config ? this._suggest_config(value) : value;
		var suggest = (this._settings.popup = this._settings.suggest = webix.ui.text.prototype.suggest_setter.call(this, value));
		var list = webix.$$(suggest).getList();
		if (list)
			list.attachEvent("onAfterLoad", webix.bind(this._reset_value, this));

		return suggest;
	},
	getList: function(){
		var suggest = webix.$$(this._settings.suggest);
		webix.assert(suggest, "Input doesn't have a list");
		return suggest.getList();
	},
	_reset_value:function(){
		var value = this._settings.value;
		//this._dataobj.firstChild - check that input is already rendered, as in IE11 it can be destroy during parent repainting
		if(!webix.isUndefined(value) && !this.getPopup().isVisible() && !this._settings.text && this._dataobj.firstChild)
			this.$setValue(value);
	},
	$skin:function(){
		this.defaults.inputPadding = webix.skin.$active.inputPadding;
	},
	$render:function(obj){
		if (webix.isUndefined(obj.value)) return;
		this.$setValue(obj.value);
	},
	getInputNode: function(){
		return this._dataobj.getElementsByTagName("DIV")[1];
	},
	getPopup: function(){
	 	return webix.$$(this._settings.popup);
	},
	getText:function(){
		var value = this._settings.value,
			node = this.getInputNode();
		if(!node)
			return value?this.getPopup().getItemText(value):"";
		return typeof node.value == "undefined" ? (this.getValue()?node.innerHTML:"") : node.value;
	},
	$setValue:function(value){
		if (!this._rendered_input) return;

		var text = value;
		var popup = this.getPopup();

		if (popup)
			var text = this.getPopup().getItemText(value);

		if (!text && value && value.id){ //add new value
			this.getPopup().getList().add(value);
			text = this.getPopup().getItemText(value.id);
			this._settings.value = value.id;
		}

		var node = this.getInputNode();

		if (webix.isUndefined(node.value))
			node.innerHTML = text || this._get_div_placeholder();
		else 
			node.value = text = text.replace(/<[^>]*>/g,"");

		this._settings.text = text;
	},
	getValue:function(){
		return this._settings.value||"";
	}
}, webix.ui.text);
