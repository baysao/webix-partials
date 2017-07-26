webix.protoUI({
	name:"template",
	$init:function(config){
		var subtype = this._template_types[config.type];
		if (subtype){
			webix.extend(config, subtype);
			
			//will reset borders for "section"
			if (config.borderless){
				delete config._inner;
				this._set_inner(config);
			}
		}

		if (this._dataobj == this._viewobj){
			this._dataobj = webix.html.create("DIV");
			this._dataobj.className = " webix_template";
			this._viewobj.appendChild(this._dataobj);
		} else 
			this._dataobj.className += " webix_template";

		this.attachEvent("onAfterRender", this._correct_width_scroll);
	},
	setValues:function(obj, update){
		this.data = update?webix.extend(this.data, obj, true):obj;
		this.render();
	},
	getValues:function(){
		return this.data;
	},
	$skin:function(){
		this._template_types.header.height = this._template_types.section.height = webix.skin.$active.barHeight;
	},
	_template_types:{
		"header":{
			css:"webix_header"
		},
		"section":{
			css:"webix_section",
			borderless:true
		},
		"clean":{
			css:"webix_clean",
			borderless:true
		}
	},
	onClick_setter:function(value){
		this.on_click = webix.extend((this.on_click || {}), value, true);

		if (!this._onClick)
			webix.extend(this, webix.MouseEvents);

		return value;
	},
	defaults:{
		template:webix.template.empty
	},
	_render_me:function(){
		this._not_render_me = false;
		this._probably_render_me();
		this.resize();
	},
	_probably_render_me:function(){
		if (!this._not_render_me){
			this._not_render_me = true;
			this.render();
		}
	},
	src_setter:function(value){
		this._not_render_me = true;
		
		if(!this.callEvent("onBeforeLoad",[])) 
			return "";
		webix.ajax(value, webix.bind(function(text){
			this._settings.template = webix.template(text);
			this._render_me();
			this.callEvent("onAfterLoad",[]);
		}, this));
		return value;
	},
	_correct_width_scroll:function(){
		//we need to force auto height calculation after content change
		//dropping the last_size flag will ensure that inner logic of $setSize will be processed
		if (this._settings.autoheight){
			this._last_size = null;
			this.resize();
		}

		if (this._settings.scroll && this._settings.scroll.indexOf("x") != -1)
			this._dataobj.style.width = this._dataobj.scrollWidth + "px";
	},
	content_setter:function(config){
		if (config){
			this._not_render_me = true;
			this.render = function(){};
			this._dataobj.appendChild(webix.toNode(config));
		}
	},
	refresh:function(){
		this.render();
	},
	setHTML:function(html){
		this._settings.template = function(){ return html; };
		this.refresh();
	},
	setContent:function(content){
		this._dataobj.innerHTML = "";
		this.content_setter(content);
	},
	$setSize:function(x,y){
		if (webix.ui.view.prototype.$setSize.call(this,x,y)){
			this._probably_render_me();
			if (this._settings.autoheight){
				var top =this.getTopParentView();
				clearTimeout(top._template_resize_timer);
				top._template_resize_timer = webix.delay(this.resize, this);
			}
			return true;
		}
	},
	$getSize:function(x,y){
		if (this._settings.autoheight && !this._settings.type)
			this._settings.height = this._get_auto_height();

		return webix.ui.view.prototype.$getSize.call(this,x,y);
	},
	_get_auto_height:function(){
		var size;
			
		this._probably_render_me();
		var padding = webix.skin.$active.layoutPadding.space;
		this._dataobj.style.height = "auto";
		size = this._dataobj.scrollHeight;
		this._dataobj.style.height = "";

		return size;
	},
	_one_time_scroll:true //scroll will appear only if set directly in config
}, webix.Scrollable, webix.AtomDataLoader, webix.AtomRender, webix.EventSystem, webix.ui.view);
