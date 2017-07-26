webix.protoUI({
	name:"dataview",
	$init:function(config){
		if (config.sizeToContent)
			//method need to be called before data-loaders
			//so we are using unshift to place it at start
			this.$ready.unshift(this._after_init_call);
		var prerender = config.prerender || this.defaults.prerender;
		if (prerender === false || (prerender !== true && config.height !== "auto" && !config.autoheight))
			webix.extend(this, webix.VirtualRenderStack, true);
		if (config.autoheight)
			config.scroll = false;

		this._contentobj.className+=" webix_dataview";

		this._viewobj.setAttribute("role", "listbox");
	},
	_after_init_call:function(){
		var test = webix.html.create("DIV",0,this.type.template({}));
		test.style.position="absolute";
		document.body.appendChild(test);
		this.type.width = test.offsetWidth;
		this.type.height = test.offsetHeight;
		
		webix.html.remove(test);
	},
	defaults:{
		scroll:true,
		datafetch:50,
		navigation:true
	},
	_id:"webix_f_id",
	_itemClassName:"webix_dataview_item",
	on_click:{
		webix_dataview_item:function(e,id){ 
			if (this._settings.select){
				if (this._settings.select=="multiselect" || this._settings.multiselect)
					this.select(id, false, ((this._settings.multiselect == "touch") || e.ctrlKey || e.metaKey), e.shiftKey); 	//multiselection
				else
					this.select(id);
			}
		}		
	},
	on_dblclick:{
	},
	on_mouse_move:{
	},
	type:{
		//normal state of item
		template:webix.template("#value#"),
		//in case of dyn. loading - temporary spacer
		templateLoading:webix.template("Loading..."),
		width:160,
		height:50,
		classname:function(obj, common, marks){
			var css = "webix_dataview_item ";

			if (common.css) css +=common.css+" ";
			if (obj.$css){
				if (typeof obj.$css == "object")
					obj.$css = webix.html.createCss(obj.$css);
				css +=obj.$css+" ";
			}
			if (marks && marks.$css) css +=marks.$css+" ";
			
			return css;
		},
		aria:function(obj, common, marks){
			return 'role="option"'+(marks && marks.webix_selected?' aria-selected="true" tabindex="0"':' tabindex="-1"');
		},
		templateStart:webix.template('<div webix_f_id="#id#" class="{common.classname()}" {common.aria()} style="width:{common.width}px; height:{common.height}px; float:left; overflow:hidden;">'),
		templateEnd:webix.template("</div>")
		
	},
	_calck_autoheight:function(width){
		return (this._settings.height = this.type.height * Math.ceil( this.data.count() / Math.floor(width / this.type.width)));
	},
	autoheight_setter:function(mode){
		if (mode){
			this.data.attachEvent("onStoreLoad", webix.bind(this.resize, this));
			this._contentobj.style.overflowY = "hidden";
		}
		return mode;
	},
	$getSize:function(dx, dy){
		if ((this._settings.xCount >0) && this.type.width != "auto" && !this._autowidth)
			this._settings.width = this.type.width*this._settings.xCount + (this._scroll_y?webix.ui.scrollSize:0);
		if (this._settings.yCount && this.type.height != "auto")
			this._settings.height = this.type.height*this._settings.yCount;

		var width = this._settings.width || this._content_width;
		if (this._settings.autoheight && width){
			this._calck_autoheight(width);
			this.scroll_setter(false);	
		}
		return webix.ui.view.prototype.$getSize.call(this, dx, dy);		
	},
	_recalk_counts:function(){
		var render = false;
		if (this._settings.yCount && this.type.height == "auto"){
			this.type.height = Math.floor(this._content_height/this._settings.yCount);
			render = true;
		}
		if (this._settings.xCount && (this.type.width == "auto"||this._autowidth)){
			this._autowidth = true; //flag marks that width was set to "auto" initially
			this.type.width = Math.floor(this._content_width/this._settings.xCount);
			render = true;
		} else 
			this._autowidth = false;

		return render;
	},
	$setSize:function(x,y){
		if (webix.ui.view.prototype.$setSize.call(this, x, y)){
			if (this._settings.autoheight && this._calck_autoheight() != this._content_height)
				return webix.delay(this.resize, this);

			if (this._recalk_counts() || this._render_visible_rows)
				this.render();
		}
	}
}, webix.DataMove, webix.DragItem, webix.MouseEvents, webix.KeysNavigation, webix.SelectionModel, webix.Scrollable, webix.CustomPrint, webix.ui.proto);

