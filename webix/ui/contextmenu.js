webix.protoUI({
	name:"contextmenu",
	_hide_on_item_click:true,
	$init: function(config){
		if(config.submenuConfig)
			webix.extend(config,config.submenuConfig);
	}
}, webix.ContextHelper, webix.ui.submenu);
