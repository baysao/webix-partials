webix.protoUI({
	name:"portlet",
	defaults:{
		layoutType:"wide",
	},
	$init:function(config){
		this._viewobj.style.position = "relative";

		if (config.header && config.body)
			config.body = [ { template:config.header, type:"header" }, config.body ];

		this.$ready.push(this._init_drag_area);
		// refresh scroll state of datatables
		webix.attachEvent("onAfterPortletMove", this._refreshChildScrolls);
	},
	_refreshChildScrolls: function(source){
		webix.ui.each(source, function(view){
			if(view._restore_scroll_state)
				view._restore_scroll_state();
		});
	},
	_init_drag_area:function(){
		var childs = this.getChildViews();

		if (childs.length > 1)
			webix.DragControl.addDrag(childs[0].$view, this);
		else {
			var drag = webix.html.create("div", { "class":"portlet_drag" }, "<span class='webix_icon fa-bars'></span>");
			this._viewobj.appendChild(drag);
			webix.DragControl.addDrag(drag, this);
		}
	},
	body_setter:function(value){
		return this.rows_setter(webix.isArray(value) ? value:[value]);
	},
	markDropArea:function(target, mode){
		if (!target)
			return webix.html.remove(this._markerbox);

		target = webix.$$(target);

		if (!this._markerbox)
			this._markerbox = webix.html.create("div",null,"&nbsp;");

		target.$view.appendChild(this._markerbox);
		this._markerbox.className = "portlet_marker"+mode;
	},
	movePortlet:function(target, mode){
		var parent = target.getParentView();
		var source = this.getParentView();

		var tindex = parent.index(target);
		var sindex = source.index(this);

		if (!webix.callEvent("onBeforePortletMove", [source, parent, this, target, mode])) return;

		webix.ui.$freeze = true;

		var shift = (source != parent ? 1 : 0);
		var isv = parent._vertical_orientation;		
		if ((mode == "top" || mode == "bottom")){
			if (isv !== 1){
				parent = webix.ui({ type:target._settings.layoutType, rows:[] }, parent, tindex+shift);
				webix.ui(target, parent, 0);
				tindex = 0; shift = 1;
			}
			if (mode == "bottom") shift+=1;
		} else if ((mode == "left" || mode == "right")){
			if (isv !== 0){
				parent = webix.ui({ type:target._settings.layoutType, cols:[] }, parent, tindex+shift);
				webix.ui(target, parent, 0);
				tindex = 0; shift = 1;
			}
			if (mode == "right") shift+=1;
		}

		if (sindex < tindex) shift -= 1;
		webix.ui(this, parent, tindex+shift );
		if (mode == "replace")
			webix.ui(target, source, sindex);

		this._removeEmptySource(source);

		webix.ui.$freeze = false;

		var tops = source.getTopParentView();
		target.resize();
		source.resize();

		webix.callEvent("onAfterPortletMove", [source, parent, this, target, mode]);
	},
	_removeEmptySource:function(view){
		var childview;
		var maxcount = 0;

		while (view.getChildViews().length <= maxcount){
			childview = view;
			view = view.getParentView();

			maxcount = 1;
		}

		if (maxcount)
			view.removeView(childview);
	},
	$drag:function(object, e){
		webix.html.addCss(this._viewobj, "portlet_in_drag");
		webix.DragControl._drag_context = {source:object, from:object};
		return this._viewobj.innerHTML;
	},
	$dragDestroy:function(target, html, e){
		webix.html.removeCss(this._viewobj, "portlet_in_drag");
		webix.html.remove(html);
		if (this._portlet_drop_target){
			this.movePortlet(this._portlet_drop_target, this._portlet_drop_mode);
			this.markDropArea();
			this._portlet_drop_target = null;
		}
	},
	_getDragItemPos: function(){
		return webix.html.offset(this.$view);
	},
	$dragPos: function(pos, e, html){
		html.style.left = "-10000px";
		var evObj = webix.env.mouse.context(e);
		var node = document.elementFromPoint(evObj.x, evObj.y);

		var view = null;
		if (node)
			view = webix.$$(node);

		this._portlet_drop_target = this._getPortletTarget(view);
		this._portlet_drop_mode = this._markPortletDrag(this._portlet_drop_target, e);

		pos.x = pos.x - this._content_width + 10;
		pos.y = pos.y - 20;

		webix.DragControl._skip = true;
	},
	_markPortletDrag:function(view, ev){
		var drop = "";
		var mode = "";

		if (ev && view){
			var box = webix.html.offset(view.$view);
			var pos = webix.html.pos(ev);
			var erx = (pos.x-box.x) - box.width/2;
			var ery = (pos.y-box.y) - box.height/2;

			mode = view._settings.mode;
			if (!mode)
				mode = Math.abs(erx)*(box.height/box.width) > Math.abs(ery) ? "cols" : "rows";

			if (mode == "cols"){
				drop = erx >=0 ? "right" :"left";
			} else if (mode == "rows"){
				drop = ery >=0 ? "bottom" : "top";
			}

			this.markDropArea(view, drop);
		}

		this.markDropArea(view, drop);
		return drop || mode;
	},
	_getPortletTarget:function(view){
		while(view){
			if (view.movePortlet)
				return view;
			else
				view = view.getParentView();
		}
	}
}, webix.ui.layout);
