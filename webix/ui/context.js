define(["webix/core/webix", "webix/ui/popup"], function webix_context(webix){
webix.protoUI({
	    name:"context"
}, webix.ContextHelper, webix.ui.popup);
    return webix;
});
