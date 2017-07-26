webix.protoUI({
	name:"multitext",
	$cssName:"text",
	defaults:{
		icon:"plus-circle",
		iconWidth:25,
		separator:", "
	},
	getValueHere:function(){
		return webix.ui.text.prototype.getValue.call(this);
	},
	setValueHere:function(value){
		return webix.ui.text.prototype.$setValue.call(this, value);
	},
	getValue:function(){
		if (this.config.mode == "extra") return this.getValueHere();

		var values = [ this.getValueHere(this) ];
		for (var i=0; i<this._subs.length; i++){
			var seg = webix.$$(this._subs[i]).getValueHere();
			if (seg) values.push(seg);
		}
		return values.join(this.config.separator);
	},
	$setValue:function(value){
		value = value || "";
		if (this._known_value == value) return;

		this._known_value = value;

		if (this.config.mode == "extra") return this.setValueHere(value);

		this.removeSection();
		var parts = value.split(this.config.separator);
		this.setValueHere.call(this, parts[0]);
		for (var i = 1; i<parts.length; i++){
			var next = this.addSection();
			webix.$$(next).setValueHere(parts[i]);
		}
	},
	_subOnChange:function(call){
		var parent = this.config.master ? webix.$$(this.config.master) : this;
		var newvalue = parent.getValue();
		var oldvalue = parent._settings.value;
		if (newvalue !== oldvalue){
			parent._settings.value = newvalue;
			parent.callEvent("onChange", [newvalue, oldvalue]);
		}
	},
	addSection:function(){
		var config = this.config,
			newConfig = {
				labelWidth: config.labelWidth,
				inputWidth: config.inputWidth,
				width: config.width,
				label: config.label ? "&nbsp;" : "",
				view: this.name,
				mode: "extra",
				value: "",
				icon: "minus-circle",
				suggest: config.suggest || null,
				master: config.id
			};

		webix.extend(newConfig, config.subConfig||{},true);

		var newone = this.getParentView().addView(newConfig);
		webix.$$(newone).attachEvent("onChange", this._subOnChange);

		this._subs.push(newone);
		return newone;
	},
	removeSection:function(id){
		var parent = this.config.master ? webix.$$(this.config.master) : this;
		for (var i = parent._subs.length - 1; i >= 0; i--){
			var section = parent._subs[i];
			if (!id || section == id){
				parent._subs.removeAt(i);
				this.getParentView().removeView(section);
			}
		}
	},
	on_click:{
		"webix_input_icon":function(ev, id, html){
			if (this.config.mode == "extra"){
				this.removeSection(this.config.id);
				var childs = this.getParentView().getChildViews();
				childs[childs.length - 1].focus();
				this._subOnChange();
			} else
				webix.$$( this.addSection() ).focus();

			return false;
		}
	},
	$init:function(){
		this._subs = webix.toArray([]);
		this.attachEvent("onKeyPress", this._onKeyPress);
	},
	$render:function(obj){
		this.$setValue(obj.value);
	},
}, webix.ui.text);
