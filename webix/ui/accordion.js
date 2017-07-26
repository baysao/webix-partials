webix.protoUI({
	name:"accordionitem",
	$init:function(config){
		this._viewobj.innerHTML = "<div webix_ai_id='"+config.id+"'  class='webix_accordionitem_header'><div tabindex='0' role='button' class='webix_accordionitem_button' ></div><div class='webix_accordionitem_label' ></div></div><div class='webix_accordionitem_body'></div>";
		
		this._contentobj = this._viewobj;
		this._headobj = this._contentobj.childNodes[0];
		if(!config.header)
			this._headobj.style.display = "none";
		this._headlabel = this._contentobj.childNodes[0].childNodes[1];
		this._headbutton = this._contentobj.childNodes[0].childNodes[0];
		this._bodyobj = this._contentobj.childNodes[1];
		this._viewobj.className +=" webix_accordionitem";
		this._head_cell = this._body_cell = null;
		this._cells = true;

		this._bodyobj.setAttribute("role", "tabpanel");
		this._headobj.setAttribute("role", "tab");

		this.attachEvent("onKeyPress", this._onKeyPress);
	},
	_remove:function(){
		this._body_cell = { destructor:function(){} };
	},
	_replace:function(new_view){
		this._body_cell.destructor();
		this._body_cell = new_view;
		this._body_cell._parent_cell = this;
		
		this._bodyobj.appendChild(this._body_cell._viewobj);
		this.resize();
	},
	_id:"webix_ai_id",
	getChildViews:function(){
		return [this._body_cell];
	},
	body_setter:function(value){
		if (typeof value != "object")
			value = {template:value };

		value._inner = { top:true, left:true, right:true, bottom:true};
		this._body_cell = webix.ui._view(value);
		this._body_cell.$view.style.border = "0px solid red";
		this._body_cell._parent_cell = this;

		this._bodyobj.appendChild(this._body_cell._viewobj);
		return value;
	},
	header_setter:function(value){
		if(value)
			value = webix.template(value);
		return value;
	},
	headerAlt_setter:function(value){
		if(value)
			value = webix.template(value);
		return value;
	},
	$getSize:function(dx, dy){
		var size =  this._body_cell.$getSize(0, 0);

		//apply external border to inner content sizes
		var _borders = this._settings._inner;
		if (_borders){
			dx += (_borders.left?0:1)+(_borders.right?0:1);
			dy += (_borders.top?0:1)+(_borders.bottom?0:1);
		}

		var header = 0;
		var self_size = webix.ui.baseview.prototype.$getSize.call(this, 0, 0);

		//use child settings if layout's one was not defined
		self_size[0] = (self_size[0] || size[0] ) +dx;
		if (self_size[1] >= 100000)
			self_size[1] = size[1];
		self_size[1] +=	dx;
		
		self_size[2] = (self_size[2] || size[2] ) +dy;
		var fixedHeight = (self_size[3]< 100000);
		if (!fixedHeight)
			self_size[3] = size[3];

		self_size[3] += dy;

		if(this.getParentView()._vertical_orientation){
			if (this._settings.collapsed){
				self_size[2] = self_size[3] = this._getHeaderSize();
			} else if(this._settings.header)
				header = this._settings.headerHeight;
		} else {
			if (this._settings.collapsed)
				self_size[0] = self_size[1] = this._getHeaderSize();
			if(this._settings.header)
				header = this._settings.headerHeight;
		}

		//include header in total height calculation
		if(!fixedHeight){
			self_size[2] += header;
			self_size[3] += header;
		}

		webix.debug_size_box(this, self_size, true);
		return self_size;
	},
	on_click:{
		webix_accordionitem_header:function(e, id){
			this._toggle(e);
			return false;
		},
		webix_accordionitem_header_v:function(e, id){
			this._toggle(e);
			return false;
		}
	},
	_toggle:function(e){
		this.define("collapsed", !this._settings.collapsed);
	},
	collapsed_setter:function(value){
		if (this._settings.header === false) return;
		//use last layout element if parent is not known yet
		var parent = this.getParentView();
		if(parent){
			if(!value)
				this._expand();
			else{
				if ( parent._canCollapse(this))
					this._collapse();
				else{
					var success = 0;
					if(parent._cells.length > 1)
						for (var i=0; i < parent._cells.length; i++){
							var sibl = parent._cells[i];
							if (this != sibl && sibl.isVisible() && sibl.expand){
								sibl.expand();
								this._collapse();
								success = 1;
								break;
							}
						}
					if (!success) return;
				}
			}

			this._settings.collapsed = value;
			if (!value) parent._afterOpen(this);

			this.refresh();
			if (!webix._ui_creation)
				this.resize();

			parent.callEvent("onAfter"+(value?"Collapse":"Expand"), [this._settings.id]);

			this._settings.$noresize = value;
		}
		return value;
	},
	collapse:function(){
		this.define("collapsed", true);
		webix.UIManager._moveChildFocus(this);
	},
	expand:function(){
		this.define("collapsed", false);
	},
	_show: function() {
		this.show();
	},
	_hide: function() {
		this.hide();
	},
	_expand:function(){
		this._bodyobj.style.display = "";
		webix.html.removeCss(this.$view, "collapsed");
		webix.html.removeCss(this._headobj, "collapsed");

		this._headobj.setAttribute("aria-expanded", "true");
	},
	_collapse:function(){
		var vertical = this.getParentView()._vertical_orientation;
		//this._original_size = (vertical?this._settings.height:this._settings.width)||-1;

		if(this._settings.headerAlt)
			this._headlabel.innerHTML = this._settings.headerAlt();
		this._bodyobj.style.display = "none";
		webix.html.addCss(this.$view, "collapsed");
		webix.html.addCss(this._headobj, "collapsed");

		this._headobj.setAttribute("aria-expanded", "false");
	},
	refresh:function(){
		var template = this._settings[this._settings.collapsed?"headerAlt":"header"] ||this._settings.header;
		if (template){
			this._headlabel.innerHTML = template();
			this._headbutton.setAttribute("aria-label", template());
		}
			
		var css = (this.getParentView()._vertical_orientation?"vertical":"horizontal");
		if(this._viewobj.className.indexOf(" "+css) < 0 ){
			webix.html.addCss(this._viewobj, css);
		}
		//fix collapsed columns in IE8
		if(!webix.env.transform){
			webix.html.addCss(this._viewobj,"webix_ie",true);
		}
	},
	_getHeaderSize:function(){
		return (this._settings.collapsed?this._settings.headerAltHeight:this._settings.headerHeight);
	},
	$setSize:function(x,y){
		if (webix.ui.view.prototype.$setSize.call(this,x,y) || this._getHeaderSize() != this._last_set_header_size){
			x = this._content_width;
			y = this._content_height;

			var headerSize = this._last_set_header_size = this._getHeaderSize();//-(this._settings._inner.top?0:1);
			if (this._settings.header){

				this._headobj.style.height=headerSize+"px";
				this._headobj.style.width="auto";
				this._headobj.style[webix.env.transform]="";

				
				this._headobj.style.borderBottomWidth = (this._settings.collapsed?0:1)+"px";

				if(this.getParentView()._vertical_orientation||!this._settings.collapsed){
					y-=this._getHeaderSize();
				} else if (this._settings.collapsed){
					//-2 - borders
					if (webix.animate.isSupported()){
						this._headobj.style.width = y + "px";
						this._headobj.style.height = x + 3 + "px";
						var d = Math.floor(y/2-x/2)+(x-this._settings.headerAltHeight)/2;
						this._headobj.style[webix.env.transform]="rotate(90deg) translate("+d+"px, "+(d+1)+"px)";
					}
					else { //IE8 fix
						this._headobj.style.width = x + "px";
						this._headobj.style.height = y + 3 + "px";
					}

				}
			}
			if(!this._settings.collapsed){
				this._body_cell.$setSize(x,y);
				this._last_size_y = y;
			}
		} else if (!this._settings.collapsed){
			var body = this._body_cell;
			if (this._last_size_y)
				body.$setSize(this._content_width, this._last_size_y);
		}
	},
	$skin:function(){
		var defaults = this.defaults;
		defaults.headerAltHeight = defaults.headerHeight = webix.skin.$active.barHeight;
		if(webix.skin.$active.borderlessAccordion)
			defaults.borderless = true;
	},
	defaults:{
		header:false,
		headerAlt:false,
		body:""
	}
}, webix.MouseEvents, webix.EventSystem, webix.ui.view);

webix.protoUI({
	name:"accordion",
	defaults:{
		panelClass:"accordionitem",
		multi:false,
		collapsed:false
	},
	$init:function(){
		this._viewobj.setAttribute("role", "tablist");
		this._viewobj.setAttribute("aria-multiselectable", "true");
	},
	addView:function(view){
		//adding view to the accordion
		var id = webix.ui.layout.prototype.addView.apply(this, arguments);
		var child = webix.$$(id);
		//repainting sub-panels in the accordion
		if (child.collapsed_setter && child.refresh) child.refresh();
		return id;
	},
	_parse_cells:function(){
		var panel = this._settings.panelClass;
		var cells = this._collection;

		for (var i=0; i<cells.length; i++){
			if ((cells[i].body || cells[i].header)&& !cells[i].view && !cells[i].align)
				cells[i].view = panel;
			if (webix.isUndefined(cells[i].collapsed))
				cells[i].collapsed = this._settings.collapsed;

		}

	
		this._skin_render_collapse = true;
		webix.ui.layout.prototype._parse_cells.call(this);
		this._skin_render_collapse = false;

		for (var i=0; i < this._cells.length; i++){
			if (this._cells[i].name == panel) 
				this._cells[i].refresh();
			this._cells[i]._accLastChild = false;
		}
		var found = false;
		for (var i= this._cells.length-1; i>=0 &&!found; i--){
			if(!this._cells[i]._settings.hidden){
				this._cells[i]._accLastChild = true;
				found = true;
			}
		}

	},
	_afterOpen:function(view){
		if (this._settings.multi === false && this._skin_render_collapse !== true){
			for (var i=0; i < this._cells.length; i++) {
				if (view != this._cells[i] && !this._cells[i]._settings.collapsed && this._cells[i].collapse)
					this._cells[i].collapse();
			}
		}
		if (view.callEvent){
			view.callEvent("onViewShow",[]);
			webix.ui.each(view, this._signal_hidden_cells);
		}
	},
	_canCollapse:function(view){
		if (this._settings.multi === true || this._skin_render_collapse) return true;
		//can collapse only if you have other item to open
		for (var i=0; i < this._cells.length; i++)
			if (view != this._cells[i] && !this._cells[i]._settings.collapsed && this._cells[i].isVisible() && !this._cells[i].$nospace)
				return true;
		return false;
	},
	$skin:function(){
		var defaults = this.defaults;
		if(webix.skin.$active.accordionType)
			defaults.type = webix.skin.$active.accordionType;
	}
}, webix.ui.layout);

webix.protoUI({
	name:"headerlayout",
	defaults:{
		type: "accordion",
		multi:"mixed",
		collapsed:false
	}
}, webix.ui.accordion);
