define([
    "views/layout/sidebar",
    "views/layout/toolbar",
//    "webix/ui/template",
//    "webix/ui/popup",
    "webix/ui/resizer",
    "webix/ui/button",
    "webix/ui/resizearea"
], function(
    sidebar,
    toolbar
           ) {

    var body = {
        rows: [{
            view: "scrollview",
            scroll: "native-y",
            body: {
                cols: [{
                    $subview: true
                }]
            }
        }]
    };

    var layout = {
        responsive: true,
        rows: [
            toolbar,
            {
                cols: [
                    sidebar,
                    {view: 'resizer'},
                    body
                ]
            }
        ]
    };

    return {
        $ui: layout,
        $menu: "app:menu",
    };

});
