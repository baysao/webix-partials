

webix.protoUI({
	name:"menu",
	_listClassName:"webix_menu",
	$init:function(config){
		this.data._scheme_init = webix.bind(function(obj){
			if (obj.disabled)
				this.data.addMark(obj.id, "webix_disabled", true, 1, true);
		}, this);

		if (config.autowidth){
			this._autowidth_submenu = true;
			delete config.autowidth;
		}

		this.data.attachEvent('onStoreUpdated', webix.bind(function(){
			this._hide_sub_menu();
		},this));
		this.attachEvent('onMouseMove', this._mouse_move_menu);
		this.attachEvent('onMouseOut',function(){
			if (this._menu_was_activated() && this._settings.openAction == "click") return;
			if (!this._child_menu_active)
				this._hide_sub_menu();
		});
		this.attachEvent('onItemClick', function(id, e, trg){
			var item = this.getItem(id);
			if (item){
				if (item.$template) return;

				var parent = this.getTopMenu();

				//ignore disabled items
				if (!this.data.getMark(id, "webix_disabled")){
					if (!parent.callEvent("onMenuItemClick", [id, e, trg])){
						e.showpopup = true;
						return;
					}

					if (this != parent)
						parent._call_onclick(id,e,trg);

					//click on group - do not close submenus
					if (!item.submenu){
						parent._hide_sub_menu(true);
						if (parent._hide_on_item_click)
							parent.hide();
					} else {
						if ((this === parent || webix.env.touch ) && parent._settings.openAction == "click"){
							this._mouse_move_activation(id, trg);
						}

						//do not close popups when clicking on menu folder
						e.showpopup = true;
					}
				}
			}
		});

		this.attachEvent("onKeyPress", function(code, e){
			if(code === 9) this.getTopMenu()._hide_sub_menu();
			else if(code === 13 || code === 32){
				var sel = this.getSelectedId(), node;
				if(sel)
					node = this.getItemNode(sel);
				if(node)
					webix.html.triggerEvent(node, "MouseEvents", "click");
			}

		});

		this.data.attachEvent("onClearAll", function(){
			this._hidden_items = [];
		});
		this.data._hidden_items = [];

		this._viewobj.setAttribute("role", "menubar");
	},
	sizeToContent:function(){
		if (this._settings.layout == "y"){
			var texts = [];
			var isSubmenu = false;
			this.data.each(function(obj){
				texts.push(this._toHTML(obj));
				if(obj.submenu)
					isSubmenu = true;
			}, this);
			// text width + padding + borders+ arrow
			this.config.width = webix.html.getTextSize(texts, this.$view.className).width+8*2+2+(isSubmenu?15:0);
			this.resize();
		} else webix.assert(false, "sizeToContent will work for vertical menu only");
	},
	getTopMenu:function(){
		var parent = this;
		while (parent._parent_menu)
			parent = webix.$$(parent._parent_menu);
		return parent;
	},
	_auto_height_calc:function(count){
		if (this._settings.autoheight) count = this.count();

		var height = 0;
		for (var i=0; i<count; i++){
			var item = this.data.pull[this.data.order[i]];
			if (item && item.$template == "Separator")
				height+=4;
			else
				height+=this.type.height;
		}
		return height;
	},
	on_mouse_move:{},
	type:{
		css:"menu",
		width:"auto",
		aria:function(obj, common, marks){
			return 'role="menuitem"'+(marks && marks.webix_selected?' aria-selected="true" tabindex="0"':'tabindex="-1"')+(obj.submenu?'aria-haspopup="true"':'')+(marks && marks.webix_disabled?' aria-disabled="true"':'');
		},
		templateStart:function(obj, common, mark){
			if (obj.$template === "Separator" || obj.$template === "Spacer"){
				return '<div webix_l_id="#id#" role="separator" tabindex="-1" class="webix_context_'+obj.$template.toLowerCase()+'">';
			}
			var link = (obj.href?" href='"+obj.href+"' ":"")+(obj.target?" target='"+obj.target+"' ":"");
			return webix.ui.list.prototype.type.templateStart(obj,common,mark).replace(/^<div/,"<a "+link)+((obj.submenu && common.subsign)?"<div class='webix_submenu_icon'></div>":"");
		},
		templateEnd: function(obj, common, mark){
			return (obj.$template === "Separator" || obj.$template === "Spacer")?"</div>":"</a>";
		},
		templateSeparator:webix.template("<div class='sep_line'></div>"),
		templateSpacer:webix.template("<div></div>")
	},
	getMenu: function(id){
		if (!this.data.pull[id]){
			for (var subid in this.data.pull){
				var obj = this.getItem(subid);
				if (obj.submenu){
					var search = this._get_submenu(obj).getMenu(id);
					if (search) return search;
				}
			}
		} else return this;
	},
	getSubMenu:function(id){
		var menu = this.getMenu(id);
		var obj = menu.getItem(id);
		return (obj.submenu?menu._get_submenu(obj):null);
	},
	getMenuItem:function(id){
		return this.getMenu(id).getItem(id);
	},
	_get_submenu:function(data){
		var sub  = webix.$$(data.submenu);
		if (!sub){
			data.submenu = this._create_sub_menu(data);
			sub = webix.$$(data.submenu);
		}
		return sub;
	},
	_mouse_move_menu:function(id, e, target){
		if (!this._menu_was_activated())
			return;

		this._mouse_move_activation(id, target);
	},
	_menu_was_activated:function(){
		var top = this.getTopMenu();
		if (top._settings.openAction == "click"){
			if (webix.env.touch) return false;
			var sub = top._open_sub_menu;
			if (sub && webix.$$(sub).isVisible())
				return true;
			return false;
		}
		return true;
	},
	_mouse_move_activation:function(id, target){
		var data = this.getItem(id);
		if (!data) return;
		
		//clear flag of submenu usage
		this._child_menu_active = null;

		//hide previously opened sub-menu
		if (this._open_sub_menu && data.submenu != this._open_sub_menu)
			this._hide_sub_menu(true);

		//show submenu
		if (data.submenu&&!this.config.hidden){

			var sub  = this._get_submenu(data);
			if(this.data.getMark(id,"webix_disabled"))
				return;
			sub.show(target,{ pos:this._settings.subMenuPos });

			sub._parent_menu = this._settings.id;

			this._open_sub_menu = data.submenu;
		}
	},
	disableItem:function(id){
		this.getMenu(id).addCss(id, "webix_disabled");
	},
	enableItem:function(id){
		this.getMenu(id).removeCss(id, "webix_disabled");
	},
	_set_item_hidden:function(id, state){
		var menu = this.data;
		if (menu._hidden_items[id] != state){
			menu._hidden_items[id] = state;
			menu.filter(function(obj){
				return !menu._hidden_items[obj.id];
			});
			this.resize();		
		}
	},
	hideItem:function(id){
		var menu = this.getMenu(id);
		if (menu) menu._set_item_hidden(id, true);
	},
	showItem:function(id){
		var menu = this.getMenu(id);
		if (menu){
			menu._set_item_hidden(id, false);
			return webix.ui.list.prototype.showItem.call(menu, id);
		}
	},
	_hide_sub_menu : function(mode){
		if (this._open_sub_menu){
			//recursive sub-closing
			var sub = webix.$$(this._open_sub_menu);
			if (sub._hide_sub_menu)	//custom context may not have submenu
				sub._hide_sub_menu(mode);
			if (mode || !sub._show_on_mouse_out){
				sub.hide();
				this._open_sub_menu = null;
			}
		}
	},
	_create_sub_menu : function(data){
		var listConfig = {
			view:"submenu",
			data:data.submenu
		};

		var settings = this.getTopMenu()._settings.submenuConfig;
		if (settings)
			webix.extend(listConfig, settings, true);

		var parentData = this.getMenuItem(data.id);
		if(parentData && parentData.config)
			webix.extend(listConfig, parentData.config, true);

		var menu = webix.ui(listConfig);
		menu._parent_menu = this;
		return menu._settings.id;
	},
	_skip_item:function(id, prev, mode){
		var item = this.getItem(id);
		if(item.$template == "Separator" || item.$template == "Spacer" || this.data.getMark(id, "webix_disabled")){
            var index = this.getIndexById(id)+(mode == "up"?-1:1);
            id = (index>=0)?this.getIdByIndex(index):null;
            return id? this._skip_item(id, prev, mode) : prev;
        }
        else
			return id;
	},
	$skin:function(){
		webix.ui.list.prototype.$skin.call(this);
		this.type.height = webix.skin.$active.menuHeight;
	},
	defaults:{
		scroll:"",
		layout:"x",
		mouseEventDelay:100,
		subMenuPos:"bottom"
	}
}, webix.ui.list);


webix.protoUI({
	name:"submenu",
	$init:function(){
		this._body_cell = webix.clone(this._dummy_cell_interface);
		this._body_cell._view = this;

		this.attachEvent('onMouseOut',function(){
			if (this.getTopMenu()._settings.openAction == "click") 
				return;
			if (!this._child_menu_active && !this._show_on_mouse_out)
				this.hide();
		});

		//inform parent that focus is still in menu
		this.attachEvent('onMouseMoving',function(){
			if (this._parent_menu)
				webix.$$(this._parent_menu)._child_menu_active = true;
		});
		this.attachEvent("onBeforeShow", function(){
			if (this.getTopMenu()._autowidth_submenu && this.sizeToContent && !this.isVisible())
				this.sizeToContent();
		});

		this._dataobj.setAttribute("role", "menu");
	},
	$skin:function(){
		webix.ui.menu.prototype.$skin.call(this);
		webix.ui.popup.prototype.$skin.call(this);

		this.type.height = webix.skin.$active.menuHeight;
	},
	_dummy_cell_interface : {
		$getSize:function(dx, dy){
			//we saving height and width, as list can hardcode new values
			var h = this._view._settings.height*1;
			var w = this._view._settings.width*1;
			var size = webix.ui.menu.prototype.$getSize.call(this._view, dx, dy);
			//restoring
			this._view._settings.height = h;
			this._view._settings.width = w;
			return size;
		},
		$setSize:function(x,y){
			if (this._view._settings.scroll)
				this._view._bodyobj.style.height = y+"px";
		},
		destructor:function(){ this._view = null; }
	},
	//ignore body element
	body_setter:function(){
	},
	getChildViews:function(){ return []; },
	defaults:{
		width:150,
		subMenuPos:"right",
		layout:"y",
		autoheight:true
	},
	type:{
		height: webix.skin.menuHeight,
		subsign:true
	}
}, webix.ui.menu, webix.ui.popup);
