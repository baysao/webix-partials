webix.protoUI({
	name:"fieldset",
	defaults:{
		borderless:true,
		$cssName:"webix_fieldset",
		paddingX: 18,
		paddingY: 30
	},
	$init:function(obj){
		webix.assert(obj.body, "fieldset must have not-empty body");

		this._viewobj.className += " "+this.defaults.$cssName;
		this._viewobj.innerHTML =  "<fieldset><legend></legend><div></div></fieldset>";
	},
	label_setter:function(value){
		this._viewobj.firstChild.childNodes[0].innerHTML = value;
		return value;
	},
	getChildViews:function(){
		return [this._body_view];
	},
	body_setter:function(config){
		this._body_view = webix.ui(config, this._viewobj.firstChild.childNodes[1]);
		this._body_view._parent_cell = this;
		return config;
	},
	getBody:function(){
		return this._body_view;
	},
	resizeChildren:function(){
		var x = this.$width - this._settings.paddingX;
		var y = this.$height - this._settings.paddingY;
		var sizes=this._body_view.$getSize(0,0);

		//minWidth
		if (sizes[0]>x) x = sizes[0];
		//minHeight
		if (sizes[2]>y) y = sizes[2];

		this._body_view.$setSize(x,y);
		this.resize();
	},
	$getSize:function(x, y){
		webix.debug_size_box_start(this, true);

		x += this._settings.paddingX;
		y += this._settings.paddingY;
		
		var t = this._body_view.$getSize(x, y);
		var s = this._last_body_size = webix.ui.view.prototype.$getSize.call(this, x, y);

		//inner content minWidth > outer
		if (s[0] < t[0]) s[0] = t[0];
		if (s[2] < t[2]) s[2] = t[2];
		//inner content maxWidth < outer
		if (s[1] > t[1]) s[1] = t[1];
		if (s[3] > t[3]) s[3] = t[3];

		webix.debug_size_box_end(this, s);
		return s;
	},
	$setSize:function(x,y){
		if (webix.ui.view.prototype.$setSize.call(this, x,y)){
			x = Math.min(this._last_body_size[1], x);
			y = Math.min(this._last_body_size[3], y);
			this._body_view.$setSize(x - this._settings.paddingX, y - this._settings.paddingY);
		}
	}
}, webix.ui.view);
