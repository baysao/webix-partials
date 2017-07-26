define(["webix/ui/window"], function popup(){
webix.protoUI({
	name:"popup",
	$init:function(){
		this._settings.head = false;
		this.$view.className += " webix_popup";
		webix.attachEvent("onClick", webix.bind(this._hide, this));
		this.attachEvent("onHide", this._hide_point);
	},
	$skin:function(){
		this.defaults.headHeight = webix.skin.$active.barHeight;
		this.defaults.padding = webix.skin.$active.popupPadding;
	},
    close:function(){
        webix.html.remove(this._point_element);
        webix.ui.window.prototype.close.call(this);
	},
	$getSize:function(x,y){
		return webix.ui.window.prototype.$getSize.call(this, x+this._settings.padding*2,y+this._settings.padding*2);
	},
	$setSize:function(x,y){
			webix.ui.view.prototype.$setSize.call(this,x,y);
			x = this._content_width-this._settings.padding*2;
			y = this._content_height-this._settings.padding*2;
			this._contentobj.style.padding = this._settings.padding+"px";
			this._headobj.style.display="none";
			this._body_cell.$setSize(x,y);
	},
	//redefine to preserve inner borders
	_inner_body_set:function(){},
	head_setter:function(){
	},
	_set_point:function(mode, left, top){
		this._hide_point();
		document.body.appendChild(this._point_element = webix.html.create("DIV",{ "class":"webix_point_"+mode },""));
		this._point_element.style.zIndex = webix.ui.zIndex();
		this._point_element.style.top = top+"px";
		this._point_element.style.left = left+"px";
	},
	_hide_point:function(){
		this._point_element = webix.html.remove(this._point_element);
	}
}, webix.ui.window);
return webix;
});
