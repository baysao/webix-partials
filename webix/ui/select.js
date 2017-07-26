
    webix.protoUI({
	    name:"select",
	    defaults:{
		    template:function(obj,common) {
			    var options = common._check_options(obj.options);
			    var id = "x"+webix.uid();
			    var html = common._baseInputHTML("select")+"id='"+id+"' style='width:"+common._get_input_width(obj)+"px;'>";

			    var optview = webix.$$(options);
                if(optview && optview.data && optview.data.each){
                    optview.data.each(function(option){
                        html+="<option"+((option.id == obj.value)?" selected='true'":"")+" value='"+option.id+"'>"+option.value+"</option>";
                    });
                }else
                    for(var i=0; i<options.length; i++) {
                        html+="<option"+((options[i].id == obj.value)?" selected='true'":"")+" value='"+options[i].id+"'>"+options[i].value+"</option>";
                    }
			    html += "</select>";
			    return common.$renderInput(obj, html, id);
		    }
	    },
        options_setter:function(value){
            if(value){
                if(typeof value =="string"){
                    var collection = new webix.DataCollection({url:value});
                    collection.data.attachEvent("onStoreLoad", webix.bind(this.refresh, this));
                    return collection;
                }
                else
                    return value;
            }
        },
	    //get input element
	    getInputNode: function() {
		    return this._dataobj.getElementsByTagName('select')[0];
	    }
    }, webix.ui.text);
