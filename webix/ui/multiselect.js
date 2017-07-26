webix.protoUI({
	name:"multiselect",
	$cssName:"richselect",
	defaults:{
        separator:","
	},
	_suggest_config:function(value){
		var isobj = !webix.isArray(value) && typeof value == "object" && !value.name; 
		var suggest = { view:"checksuggest", separator:this.config.separator, buttonText: this.config.buttonText, button: this.config.button };

		if (this._settings.optionWidth)
			suggest.width = this._settings.optionWidth;
		else
			suggest.fitMaster = true;

		if (isobj)
			webix.extend(suggest, value, true);

		var view = webix.ui(suggest);
		var list = view.getList();
		if (typeof value == "string")
			list.load(value);
		else if (!isobj)
			list.parse(value);

		view.attachEvent("onShow",function(node,mode, point){
			view.setValue(webix.$$(view._settings.master).config.value);
		});

		return view;
	},

	$setValue:function(value){
		if (!this._rendered_input) return;
		var popup = this.getPopup();
		var text = "";
		if(popup){
			text = popup.setValue(value);
			if(typeof text == "object"){
				text = text.join(this.config.separator+" ");
			}

		}
		this._settings.text = text;

		var node = this.getInputNode();
		node.innerHTML = text || this._get_div_placeholder();
	},
	getValue:function(){
		return this._settings.value||"";
	},
}, webix.ui.richselect);
