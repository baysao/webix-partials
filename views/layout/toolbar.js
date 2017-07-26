define(["webix/ui/toolbar"], function(){
        //Top toolbar
    var toolbar = {
        view: "toolbar",
        elements: [{
            view: "button",
            type: "icon",
            icon: "bars",
            width: 50,
            click: function() {
                $$("app:menu").toggle();
            }
        }, ]
    };

    return {
        $ui: toolbar
    }
});
