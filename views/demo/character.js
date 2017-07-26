define(["app", "config", "ws"], function($app, $config, $ws) {
    var ws =  $ws.connectWithToken();
//    var uid = Cookies.get("uid");
    var labelWidth = 200;
    var initDone = false;
    var ui = {
        //type: 'material',
        id: 'demo_character',
        rows: [{
            template: "Character",
            type: 'header'
        },
               {
                   view: 'form',
                   id: 'res_form',
                   elementsConfig: {
                       labelWidth: labelWidth
                   },
                   elements: [
                       {view: 'text', name: 'player_name', label: 'Player Name'},
                       {view: 'datepicker', id: 'player_birthday', name: 'player_birthday', label: 'Birthday'},
                       {view: 'combo', id: 'player_gender', name: 'player_gender', label: 'Character Gender', options: [
                           {id: 'tanker', value: "Tanker"}, {id: 'fighter', value: "Fighter"}
                       ]},
                       {view: 'combo', id: 'player_type', name: 'player_type', label: 'Character Type', options: [
                           {id: 'kim', value: 'Kim'},
                           {id: 'moc', value: 'Mộc'},
                           {id: 'thuy', value: 'Thủy'},
                           {id: 'hoa', value: 'Hỏa'},
                           {id: 'tho', value: 'Thổ'},
                       ]},
                       {view: 'checkbox', name: 'isnew'},
                       {view: 'text', name: 'healthy', label: 'Healthy(HP)', disabled: true, labelWidth: 100, inputWidth: 200},
                       {view: 'text', name: 'spirit', label: 'Spirit(SP)', disabled: true, labelWidth: 100, inputWidth: 200},

                       {cols:[
                           {view: 'text', name: 'attack', label: 'Attack', disabled: true, labelWidth: 100, inputWidth: 200},
                           {view: 'text', name: 'defense', label: 'Defense', disabled: true, labelWidth: 100, inputWidth: 200},
                           {view: 'text', name: 'accuracy', label: 'Accuracy', disabled: true, labelWidth: 100, inputWidth: 200},
                       ]},

                       {cols:[
                           {view: 'text', name: 'speed', label: 'Speed', disabled: true, labelWidth: 100, inputWidth: 200},
                           {view: 'text', name: 'rage', label: 'Rage', disabled: true, labelWidth: 100, inputWidth: 200},
                           {view: 'text', name: 'fame', label: 'Fame', disabled: true, labelWidth: 100, inputWidth: 200},
                       ]},

                   ]},
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
                       value: 'Room',
                       width: 100,
                       css: 'button_primary button_raised',
                       click: function(){ this.$scope.show("/demo.room");}
                   }
                         ]
               }
              ]
    };
    function gotoLogin($scope){
        $scope.show("/demo.login");
    }
    return {
        $oninit: function($view, $scope) {
            if(!ws)
                ws =  $ws.connectWithToken();
            //uid = Cookies.get('uid');
            console.log("oninit");
            
            //init connection with server
            $ws.onmessage(ws, function(e){
                $app.callEvent("onmessage", [e]);
            }, function(){
                gotoLogin($scope);
            })

            //register event
            $app.callEvent("onGetCurrentCharacter");
            $$('player_birthday').attachEvent("onChange", function(){
                $app.callEvent("onPlayerBirthdayChange");
            })

            $$('player_type').attachEvent("onChange", function(){
                $app.callEvent("onTypeAndGenderChange");
            })

            $$('player_gender').attachEvent("onChange", function(){
                $app.callEvent("onTypeAndGenderChange");
            })

            $$('btn_save').attachEvent("onItemClick", function() {
                $app.callEvent("onSave");
            })
        },
        $onevent: {
            onGetCurrentCharacter: function(){
                var uid = Cookies.get('uid');
                var args = {
                    cmd: "character_read",
                    uid: uid,
                    data: {}
                }
                $ws.sendText(ws, args);
            },
            onMessage: function(e){
                var msg = JSON.parse(e.data);
                var status = msg.status;
                if(!status) {
                    return;
                }
                var cmd = msg.cmd;
                if(_.isArray(msg.data))
                    data = msg.data[0];
                else
                    data = msg.data;
                switch(cmd) {
                case "character_read":
                    if(data.player_birthday)
                        data.player_birthday = new Date(parseInt(data.player_birthday));
                    console.log(data);
                    $$("res_form").setValues(data, true);
                    break;
                }
            },
            onPlayerBirthdayChange: function(){
                console.log("onPlayerBirthdayChange");
                var player_birthday = $$('player_birthday').getValue();
                var uid = Cookies.get('uid');
                if(player_birthday) {
                    var args = {
                        cmd: "character_read",
                        uid: uid,
                        data: {player_birthday: player_birthday.getTime()}
                    }
                    $ws.sendText(ws, args);
                }
            },
            onTypeAndGenderChange: function(){
                var player_gender = $$('player_gender').getValue();
                var player_type = $$('player_type').getValue();
                if(!_.isEmpty(player_type) && !_.isEmpty(player_gender)) {
                    var uid = Cookies.get('uid');
                    var args = {
                        cmd: "character_read",
                        uid: uid,
                        data: {
                            player_gender: player_gender,
                            player_type: player_type
                        }
                    }
                    $ws.sendText(ws, args);
                }
            },
            onSave: function() {
                var values = $$("res_form").getValues();
                if(values.player_birthday){
                    values.player_birthday =  values.player_birthday.getTime();
                }
                var args = {cmd: "character_create", data: values}
                $ws.sendText(ws, args);
            }
        },
        $ui: ui,
        $onurlchange: function($config, $url, $scope){
            console.log('onurlchange');
        },
        $ondestroy: function(){
            console.log('destroy');
        }
    }
})
