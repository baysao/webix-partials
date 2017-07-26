define(["app", "config"], function($app, $config) {
    var api_url = $config.api_url + "/login";
    var labelWidth = 200;

    var ui = {
        //type: 'material',
        id: 'demo_login',
        rows: [{
            template: "Login",
            type: 'header'
        },
               {
                   view: 'form',
                   id: 'res_form',
                   elementsConfig: {
                       labelWidth: labelWidth
                   },
                   elements: [
                       {view: 'text', name: 'username', label: 'Username'},
                       {view: 'text', name: 'password', type: 'password', label: 'Password'}
                   ]
               },
               {
                   id: 'res_marker'
               },
               {
                   cols: [{
                       view: 'button',
                       id: 'btn_save',
                       value: 'Save',
                       width: 100,
                       css: 'button_primary button_raised'
                   }, {},{
                          view: 'button',
                          id: 'btn_character',
                          value: 'Character',
                          width: 100,
                          css: 'button_primary button_raised',
                          click: function(){ this.$scope.show("/demo.character");}
                         }
                         ]
               }
              ]
    };
    return {
        $oninit: function($view, $scope) {
            $$('btn_save').attachEvent("onItemClick", function() {
                $app.callEvent("onSave");
            })
        },
        $ondestroy: function(){

        },
        $onevent: {
            onSave: function() {
                var values = $$("res_form").getValues();
                webix.ajax().post(api_url, values, function(text, xhr) {
                    var res = xhr.json();
                    if(res.status) {
                        webix.message("Successful");
                    } else {
                        webix.message("Failed");
                    }
                        
                })
            }
        },
        $ui: ui
    }
})
