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
                {view: 'button', id: 'btn_reg', label: 'Login'}
        ]
    }

    return {
        $oninit: function($view, $scope){
            $$('btn_reg').attachEvent("onItemClick", function(){
                var data = $$('form_reg').getValues();
                $app.callEvent("evt_login", [$scope, data])
            })
        },
        $onevent: {
            evt_login: function($scope, data){
                webix.ajax().post("/api/v1/viectoi/user/login", data, function(text, xhr){
                    var res = xhr.json();
                    if(res.status) {
                        webix.message("Login successful");
                        $scope.show("/app/dashboard");
                    } else
                        webix.message({type: "error", text: "Login failed"})
                })
            }
        },
        $ui: ui
    }
})
