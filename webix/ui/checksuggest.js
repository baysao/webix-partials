webix.protoUI({
	name:"checksuggest",
	defaults:{
		button:false,
		body:{
			rows:[
				{ view:"list",  css:"webix_multilist", borderless:true, autoheight:true, yCount:5, select: true,
					type:"checklist",
					on:{
						onItemClick: function(id, e){
							var item = this.getItem(id);
							item.$checked = item.$checked?0:1;
							this.refresh(id);
							var popup = this.getParentView().getParentView();
							popup._toggleOption(id, e);
						}
					}
				},
				{ view:"button", click:function(){
					var suggest = this.getParentView().getParentView();
					suggest.setMasterValue({ id:suggest.getValue() });
					suggest.hide();
				}}
			]
		}
	},
	$init: function(){
		this._valueHistory = {};
		this.$ready.push(this._onReady);
	},
	_onReady: function(){
		var list = this.getList();
		if(list.config.dataFeed){
			var suggest = this;
			list.attachEvent("onAfterLoad", function(){
				suggest.setValue(suggest._settings.value);
			});
			list.getItem = function(id){
				return this.data.pull[id] || suggest._valueHistory[id];
			};
		}

	},
	$enterKey: function(popup,list) {
		if (list.count && list.count()){
			if (popup.isVisible()) {
				var value = list.getSelectedId(false, true);
				if(value){
					this._toggleOption(value);
				}
				popup.hide(true);
			} else {
				popup.show(this._last_input_target);
			}
		} else {
			if (popup.isVisible())
				popup.hide(true);
		}
	},
	_show_selection: function(){
		var list = this.getList();
		if( list.select)
			list.unselect();
	},
	setValue:function(value){
		var i,
			list = this.getList(),
			text = [],
			values = {},
			changed = [];

		value = value || [];

		if (typeof value == "string")
			value = value.split(this.config.separator);
		else if(list.config.dataFeed)
			value = this._toMultiValue(value);

		for ( i = 0; i < value.length; i++){
			values[value[i]] = 1;
			if(list.getItem(value[i])){
				if( this._valueHistory)
					this._valueHistory[value[i]] = webix.copy(list.getItem(value[i]));
				text.push(this.getItemText(value[i]));
			}
		}


		list.data.each(function(item){
			if(item.$checked){
				if(!values[item.id]){
					item.$checked = 0;
					changed.push(item.id);
				}
			}
			else{
				if(values[item.id]){
					item.$checked = 1;
					changed.push(item.id);
				}
			}

		},this,true);

		for( i=0; i < changed.length; i++ ){
			list.refresh(changed[i]);
		}
		this._settings.value = value.length?value.join(this.config.separator):"";
		return text;
	},
	getValue:function(){
		return this._settings.value;
	},
	_preselectMasterOption: function(){
		var node, master;
		if (this._settings.master){
			master = webix.$$(this._settings.master);
			node = master.getInputNode();
		}
		node = node || this._last_input_target;
		if(node)
			node.focus();
	},
	_toMultiValue: function(value){
		if(value && webix.isArray(value)){
			var values = [];
			for(var i =0; i < value.length; i++){
				if(value[i].id){
					this._valueHistory[value[i].id] = webix.copy(value[i]);
					values.push(value[i].id);
				}
				else{
					values.push(value[i]);
				}
			}
			value = values;
		}
		return value;
	}
}, webix.ui.multisuggest);
