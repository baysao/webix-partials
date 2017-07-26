define(["webix/core/webix"], function webix_scrollview(webix){
/*scrollable view with another view insize*/
    webix.protoUI({
	    name:"scrollview",
	    defaults:{
		    scroll:"y",
		    scrollSpeed:"0ms"
	    },
	    $init:function(){
		    this._viewobj.className += " webix_scrollview";
	    },
	    body_setter:function(config){
		    config.borderless = true;
		    this._body_cell = webix.ui._view(config);
		    this._body_cell._parent_cell = this;
		    this._dataobj.appendChild(this._body_cell._viewobj);
	    },
	    getChildViews:function(){
		    return [this._body_cell];
	    },
	    getBody:function(){
		    return this._body_cell;
	    },
	    resizeChildren:function(){
		    this._desired_size = this._body_cell.$getSize(0, 0);
		    this._resizeChildren();
		    webix.callEvent("onResize",[]);
	    },
	    _resizeChildren:function(){
		    var scroll_size = this._native_scroll || webix.ui.scrollSize;
		    var cx = Math.max(this._content_width, this._desired_size[0]);
		    var cy = Math.max(this._content_height, this._desired_size[2]);
		    this._body_cell.$setSize(cx, cy);			
		    this._dataobj.style.width = this._body_cell._content_width+"px";
		    this._dataobj.style.height = this._body_cell._content_height+"px";
		    if (webix.env.touch){
			    var state = this.getScrollState();
			    var top = this._body_cell._content_height - this._content_height;
			    if (top < state.y)
				    this.scrollTo(null, top);
		    }
		    if (webix._responsive_exception){
			    webix._responsive_exception = false;
			    this._desired_size = this._body_cell.$getSize(0, 0);
			    this._resizeChildren();
		    }
	    },
	    $getSize:function(dx, dy){
		    var desired_size = this._desired_size = this._body_cell.$getSize(0, 0);
		    var self_sizes   = webix.ui.view.prototype.$getSize.call(this, dx, dy);
		    var scroll_size = this._native_scroll || webix.ui.scrollSize;

		    if(this._settings.scroll=="x"){
			    self_sizes[2] = Math.max(self_sizes[2], desired_size[2]) + scroll_size;
			    self_sizes[3] = Math.min(self_sizes[3], desired_size[3]) + scroll_size;
		    } else if(this._settings.scroll=="y"){
			    self_sizes[0] = Math.max(self_sizes[0], desired_size[0]) + scroll_size;
			    self_sizes[1] = Math.min(self_sizes[1], desired_size[1]) + scroll_size;
		    }
		    return self_sizes;
	    },
	    $setSize:function(x,y){
		    var temp = webix.ui.scrollSize;
		    webix.ui.scrollSize = this._native_scroll || temp;

		    if (webix.ui.view.prototype.$setSize.call(this,x,y))
			    this._resizeChildren();
		    
		    webix.ui.scrollSize = temp;
	    },
	    scroll_setter:function(value){
		    var custom = webix.env.$customScroll;
		    if (typeof value == "string" && value.indexOf("native-") === 0){
			    this._native_scroll = 17;
			    value = value.replace("native-");
			    webix.env.$customScroll = false;
		    }

		    value =  webix.Scrollable.scroll_setter.call(this, value);

		    webix.env.$customScroll = custom;
		    return value;
	    },
	    _replace:function(new_view){
		    this._body_cell.destructor();
		    this._body_cell = new_view;
		    this._body_cell._parent_cell = this;
		    
		    this._bodyobj.appendChild(this._body_cell._viewobj);
		    this.resize();
	    },
	    showView: function(id){
		    var topPos = webix.$$(id).$view.offsetTop-webix.$$(id).$view.parentNode.offsetTop;
		    this.scrollTo(0, topPos);
	    }
    }, webix.Scrollable, webix.EventSystem, webix.ui.view);
return webix;
});
