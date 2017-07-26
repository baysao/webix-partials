webix.protoUI({
	name:"tree",
	defaults:{
		scroll:"a",
		navigation:true
	},
	$init:function(){
		this._viewobj.className += " webix_tree";

		//map API of DataStore on self
		webix.extend(this.data, webix.TreeStore, true);
		webix.extend(this.on_click, webix.TreeClick);
		this.attachEvent("onAfterRender", this._refresh_scroll);
		this.attachEvent("onPartialRender", this._refresh_scroll);
		this.data.provideApi(this,true);
		this._viewobj.setAttribute("role", "tree");

	},
	//attribute , which will be used for ID storing
	_id:"webix_tm_id",
	//supports custom context menu
	on_context:{},
	on_dblclick:{
		webix_tree_checkbox:function(){
			if(this.on_click.webix_tree_checkbox)
				return this.on_click.webix_tree_checkbox.apply(this,arguments);
		}
	},
	$fixEditor: function(editor) {
		var item = this.getItemNode(editor.id).querySelector("span");
		if (item){
			if (item.innerHTML === "") item.innerHTML ="&nbsp;";
			var padding = 10;
			var pos = item.offsetLeft;
			editor.node.style.width = this.$view.scrollWidth - pos - padding + "px";
			editor.node.style.marginLeft = pos + "px";
			editor.node.style.left = "0px";
		}
	},
	//css class to action map, for onclick event
	on_click:{
		webix_tree_item:function(e, id, node){
			if(this._settings.activeTitle){
				var item = this.getItem(id);
				if(item.open)
					this.close(id);
				else
					this.open(id);
			}
			if (this._settings.select){
				if (this._settings.select=="multiselect" || this._settings.multiselect){
					if (this._settings.multiselect == "level"){
						//allow only selection on the same level
						var select = this.getSelectedId(true)[0];
						if (select && this.getParentId(id) != this.getParentId(select)) 
							return;
					}
					this.select(id, false, (e.ctrlKey || e.metaKey || (this._settings.multiselect == "touch")), e.shiftKey); 	//multiselection
				} else
					this.select(id);
			}
		}
	},
	_paste: {
		// insert new item with pasted value
		insert: function(text) {
			var parent = this.getSelectedId() ||'0' ;
			this.add({ value: text }, null, parent);
		},
		// change value of each selected item
		modify: function(text) {
			var sel = this.getSelectedId(true);
			for (var i = 0; i < sel.length; i++) {
				this.getItem(sel[i]).value = text;
				this.refresh(sel[i]);
			}
		},
		// do nothing
		custom: function(text) {}
	},
	_drag_order_complex:true,
	$dragHTML:function(obj){
		return "<div class='borderless'>"+this.type.template(obj, this.type)+"</div>";
	},
	
	//css class to action map, for dblclick event
	type:webix.extend({
		//normal state of item
		template:function(obj,common){
			var template = common["template"+obj.level]||common.templateCommon;
			return template.apply(this, arguments);
		},
		classname:function(obj, common, marks){
			var css = "webix_tree_item";

			if (obj.$css){
				if (typeof obj.$css == "object")
					obj.$css = webix.html.createCss(obj.$css);
				css += " "+obj.$css;
			}
			if (marks && marks.$css)
				css += " "+marks.$css;

			return css;
		},
		aria:function(obj, common, marks){
			return 'role="treeitem"'+(marks && marks.webix_selected?' aria-selected="true" tabindex="0"':' tabindex="-1"')+
				(obj.$count?('aria-expanded="'+(obj.open?"true":"false")+'"'):'')+'aria-level="'+obj.$level+'"';
		},
		templateCommon:webix.template("{common.icon()} {common.folder()} <span>#value#</span>"),
		templateStart:webix.template('<div webix_tm_id="#id#" class="{common.classname()}" {common.aria()}>'),
		templateEnd:webix.template("</div>"),
		templateCopy: webix.template("#value#")
	}, webix.TreeType)
}, webix.AutoTooltip, webix.Group, webix.TreeAPI, webix.DragItem, webix.TreeDataMove, webix.SelectionModel, webix.KeysNavigation, webix.MouseEvents, webix.Scrollable, webix.TreeDataLoader, webix.ui.proto, webix.TreeRenderStack, webix.CopyPaste, webix.EventSystem);

if (webix.ui.tree)
	webix.extend(webix.ui.tree, webix.TreeStateCheckbox, true);
webix.type(webix.ui.tree, {
	name:"lineTree",
	css:"webixLineTree",
	icon:function(obj, common){
		var html = "";
		var open = "";
		for (var i=1; i<=obj.$level; i++){
			if (i==obj.$level)
				var open = (obj.$count?(obj.open?'webix_tree_open ':'webix_tree_close '):'webix_tree_none ');

			var icon = this._icon_src(obj, common, i);
			if (icon)
				html+="<div class='"+open+"webix_tree_img webix_tree_"+icon+"'></div>";
		}
		return html;
	},
	_icon_src:function(obj, common, level){
		var lines = common._tree_branch_render_state; 
		var tree = webix.TreeRenderStack._obj;

		if (lines === 0 && tree){
			//we are in standalone rendering 
			//need to reconstruct rendering state
			var lines_level = obj.$level;
			var branch_id = obj.id;

			lines = [];
			while (lines_level){
				var parent_id = tree.getParentId(branch_id);
				var pbranch = tree.data.branch[parent_id];
				if (pbranch[pbranch.length-1] == branch_id)
					lines[lines_level] = true;	

				branch_id = parent_id;
				lines_level--;
			}

			//store for next round
			common._tree_branch_render_state = lines;
		}
		if (!lines)
			return 0;
		//need to be replaced with image urls
		if (level == obj.$level){
			var mode = 3; //3-way line
			if (!obj.$parent){ //top level
				if (obj.$index === 0)
					mode = 4; //firts top item
			}

			if (lines[obj.$level])
				mode = 2;

			if (obj.$count){
				if (obj.open)
					return "minus"+mode;
				else
					return "plus"+mode;
			} else
				return "line"+mode;
		} else {
			if (!lines[level])
				return "line1";
			return "blank";
		}
	}
});
