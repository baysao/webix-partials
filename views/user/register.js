define(["app"], function($app){
    var ui = {
        rows: [
            {
                view: 'form',
                id: 'form_reg',
                elementsConfig: {
                    labelWidth: 500
                },
                elements: [
                    {view: 'text', name: 'username', label: 'Username'},
                    {view: 'text', name: 'password', type: 'password', label: 'Password'}
                ]
            }, {},
                {view: 'button', id: 'btn_reg', label: 'Register'}
        ]
    }

    return {
        $oninit: function($view, $scope){
            $$('btn_reg').attachEvent("onItemClick", function(){
                var data = $$('form_reg').getValues();
                $app.callEvent("evt_register", [$scope, data])
            })
        },
        $onevent: {
            evt_register: function($scope, data){
                webix.ajax().post("/api/v1/viectoi/user/register", data, function(text, xhr){
                    var res = xhr.json();
                    if(res.status) {
                        webix.message("Register successful")
                    } else
                        webix.message({type: "error", text: "Register failed"})
                    //console.log(res);
                })
            }
        },
        $ui: ui
    }
})
