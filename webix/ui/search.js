
    webix.protoUI({
	    name:"search",
	    $init:function(){
		    this.on_click["fa-search"] = function(e){
			    this.callEvent("onSearchIconClick", [e]);
		    };
	    },
	    $skin:function(){
		    this.defaults.inputPadding = webix.skin.$active.inputPadding;
	    },
	    defaults:{
		    type:"text",
		    icon:"search"
	    }
    }, webix.ui.text);
