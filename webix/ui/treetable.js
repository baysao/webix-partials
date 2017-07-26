
webix.protoUI({
	name:"treetable",
	$init:function(){
		webix.extend(this.data, webix.TreeStore, true);
		webix.extend(this.type, webix.TreeType);
		webix.extend(this,  webix.TreeDataMove, true);

		for (var key in webix.TreeClick)
			if (!this.on_click[key])
				this.on_click[key] = this._unwrap_id(webix.TreeClick[key]);
		
		this.type.treetable = webix.template("{common.space()}{common.icon()} {common.folder()}");
		this.type.treecheckbox = function(obj, common){
			if (obj.indeterminate && !obj.nocheckbox)
				return "<div class='webix_tree_checkbox webix_indeterminate'></div>";
			else
				return webix.TreeType.checkbox.apply(this, arguments);
		};
	
		this.data.provideApi(this,true);

		this._viewobj.setAttribute("role", "treegrid");

	},
	$exportView:function(options){
		webix.extend(options, { filterHTML: true });
		return this;
	},
	_drag_order_complex:false,
	_unwrap_id:function(original){
		return function (e,id){
			id = id.row;
			return original.call(this,e,id);
		};
	},
	getState:function(){
		var state = webix.DataState.getState.call(this);
		webix.extend(state, webix.TreeAPI.getState.call(this));
		return state;
	},
	setState:function(state){
		if (webix.TreeAPI.setState.call(this, state)){
			//run grid-state only when tree component was fully loaded 
			webix.DataState.setState.call(this, state);	
		}
	},
	clipboard_setter: function(value) {
		webix.extend(this._paste, webix.TreeTablePaste);
		return webix.TablePaste.clipboard_setter.call(this, value);
	},
	_run_load_next:function(conf, direction){
		for (var i=0; i<conf.start; i++){
			var id = this.data.order[i];
			if (id && this.getItem(id).$level != 1)
				conf.start--;
		}
		return webix.ui.datatable.prototype._run_load_next.call(this, conf, direction);
	},
}, webix.TreeAPI, webix.TreeStateCheckbox, webix.TreeDataLoader, webix.ui.datatable);
