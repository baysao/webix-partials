define([
    "webix/ui/tree",
    "webix/components/sidebar/sidebar"
], function() {
    var menu_data = [{
        id: "demo",
        value: "Demo",
        icon: "database",
        open: true,
        data: [
            {
                id: "dashboard",
                value: "Dashboard",
                icon: "plus",
                details: ""
            },
        ]
    }];
    var sidebar = {
        view: "sidebar",
        id: "app:menu",
        css: "menu",
        activeTitle: true,
        select: true,
        data: menu_data,
        on: {
            onAfterSelect: function(id) {
                this.$scope.show("./" + id);
            }
        }
    };
    return {
        $ui: sidebar
    }
})
