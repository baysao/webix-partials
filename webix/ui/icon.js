    webix.protoUI({
	    name:"icon",
	    $skin:function(){
		    this.defaults.height = webix.skin.$active.inputHeight;
	    },
	    defaults:{
		    template:function(obj){
			    return "<button type='button' "+" style='height:100%;width:100%;' class='webix_icon_button'><span class='webix_icon fa-"+obj.icon+" '></span>"+
				    (obj.badge ? "<span class='webix_badge'>"+obj.badge+"</span>":"")+
				    "</button>";
		    },
		    width:33
	    },
	    _set_inner_size:function(){
		    
	    }
    }, webix.ui.button);
