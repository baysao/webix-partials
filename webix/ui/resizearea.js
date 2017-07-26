define(["webix/core/webix"], function webix_resizearea(webix){
webix.protoUI({
	    name:"resizearea",
	    defaults:{
		    dir:"x"
	    },
	    $init:function(config){
		    var dir = config.dir||"x";
		    var node = webix.toNode(config.container);
            var size = (dir=="x"?"width":"height");
		    var margin = (config.margin? config.margin+"px":0);

		    this._key_property = (dir == "x"?"left":"top");

		    this._viewobj = webix.html.create("DIV",{
			    "class"	: "webix_resize_area webix_dir_"+dir
		    });
		    //[[COMPAT]] FF12 can produce 2 move events
		    webix._event(this._viewobj, webix.env.mouse.down, webix.html.stopEvent);

		    if(margin){
			    if(dir=="x")
				    margin = margin+" 0 "+margin;
			    else
				    margin = "0 "+margin+" 0 "+margin;
		    }
		    this._dragobj = webix.html.create("DIV",{
			    "class"	: "webix_resize_handle_"+dir,
			    "style" : (margin?"padding:"+margin:"")
		    },"<div class='webix_handle_content'></div>");

		    this._originobj = webix.html.create("DIV",{
			    "class"	: "webix_resize_origin_"+dir
		    });

            if(config[size]){
                this._originobj.style[size] = config[size]+(config.border?1:0)+"px";
                this._dragobj.style[size] = config[size]+"px";
            }
		    if (config.cursor)
			    this._dragobj.style.cursor = this._originobj.style.cursor = this._viewobj.style.cursor = config.cursor;
		    this._moveev =	webix.event(node, webix.env.mouse.move, this._onmove, {bind:this});
		    this._upev =	webix.event(document.body, webix.env.mouse.up, this._onup, {bind:this});

		    this._dragobj.style[this._key_property] = this._originobj.style[this._key_property] = config.start+"px";

		    node.appendChild(this._viewobj);
		    node.appendChild(this._dragobj);
		    node.appendChild(this._originobj);
	    },
	    _onup:function(){

		    this.callEvent("onResizeEnd", [this._last_result]);

		    webix.eventRemove(this._moveev);
		    webix.eventRemove(this._upev);

		    webix.html.remove(this._viewobj);
		    webix.html.remove(this._dragobj);
		    webix.html.remove(this._originobj);
		    this._viewobj = this._dragobj = this._originobj = null;
	    },
	    _onmove:function(e){
		    var pos = webix.html.pos(e);
		    this._last_result = (this._settings.dir == "x" ? pos.x : pos.y)+this._settings.start-this._settings.eventPos;
		    this._dragobj.style[this._key_property] = this._last_result+"px";
		    this.callEvent("onResize", [this._last_result]);
	    }
    }, webix.EventSystem, webix.Settings);
return webix;
});
