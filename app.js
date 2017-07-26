/*
	App configuration
*/

define([
    "webix/jet-core/core",
    "webix/core/webix",
    "webix/core/promiz",
    "webix/core/remote",

    "webix/core/export",
    "webix/core/proxy",
    "webix/core/history",
    "webix/core/markup",
    "webix/core/animate",
    "webix/core/CustomScroll",
    "webix/core/MouseEvents",
    "webix/core/DragControl",
    "webix/ui/layout",
    "webix/ui/window",
    "webix/ui/text",
    "webix/ui/spacer",
    "webix/ui/scrollview",
    "webix/ui/list",
    "webix/ui/template",
    "webix/ui/popup",

], function(
    core
){

	if(!webix.env.touch && webix.ui.scrollSize && webix.CustomScroll)
		webix.CustomScroll.init();

    webix.ui.fullScreen();

    //configuration
    var app = core.create({
		id:			"admin-demo",
		name:		"Webix Admin",
		version:	"0.1",
		debug:		true,
		start:		"/app/dashboard"
	});

	// app.use(menu);
	// app.use(locale);
	// app.use(theme);

	return app;
});
