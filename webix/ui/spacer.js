define(["webix/core/webix"], function webix_spacer(webix){
webix.protoUI({
	    name:"spacer",
	    defaults:{
		    borderless:true
	    },
	    $init:function(){
		    this._viewobj.className += " webix_spacer";
	    }
    }, webix.ui.view);
return webix;
});
