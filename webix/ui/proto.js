define("webix/core/webix", function webix_proto(webix){
webix.protoUI({
	    name:"proto",
	    $init:function(){
		    this.data.provideApi(this, true);
		    this._dataobj = this._dataobj || this._contentobj;
		    
		    //render self , each time when data is updated
		    this.data.attachEvent("onStoreUpdated",webix.bind(function(){
			    this.render.apply(this,arguments);
		    },this));
	    },
	    $setSize:function(){
		    if (webix.ui.view.prototype.$setSize.apply(this, arguments))
			    this.render();
	    },
	    _id:"webix_item",
	    on_mouse_move:{
	    },
	    type:{}
    }, webix.PagingAbility, webix.DataMarks, webix.AutoTooltip,webix.ValidateCollection,webix.RenderStack, webix.DataLoader, webix.ui.view, webix.EventSystem, webix.Settings);
return webix;
});
