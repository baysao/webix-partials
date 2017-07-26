    webix.protoUI({
	    name:"form",
	    defaults:{
		    type:"form",
		    autoheight:true
	    },
	    _default_height:-1,
	    _form_classname:"webix_form",
	    _form_vertical:true,
	    $init:function(){
		    this._viewobj.setAttribute("role", "form");
	    },
	    $getSize:function(dx, dy){
		    if (this._scroll_y && !this._settings.width) dx += webix.ui.scrollSize;

		    var sizes = webix.ui.layout.prototype.$getSize.call(this, dx, dy);

		    if (this._settings.scroll || !this._settings.autoheight){
			    sizes[2] =  this._settings.height || this._settings.minHeight || 0;
			    sizes[3] += 100000;
		    }
		    
		    return sizes;
	    }
    }, webix.ui.toolbar);
