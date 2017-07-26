
    webix.protoUI({
	    name:"textarea",
	    defaults:{
		    template:function(obj, common){ 
			    var name = obj.name || obj.id;
			    var id = "x"+webix.uid();

			    var html = common._baseInputHTML("textarea")+"style='width:"+common._get_input_width(obj)+"px;'";
			    html +=" id='"+id+"' name='"+name+"' class='webix_inp_textarea'>"+common._pattern(obj.value|| (obj.value ===0?"0":""))+"</textarea>";

			    return common.$renderInput(obj, html, id);
		    },
		    height:0,
		    minHeight:60
	    },
	    $skin:function(){
		    this.defaults.inputPadding = webix.skin.$active.inputPadding;
		    this._inputSpacing = webix.skin.$active.inputSpacing;
	    },
	    _skipSubmit: true,
	    $renderLabel: function(config, id){
		    var labelAlign = (config.labelAlign||"left");
		    var top = this._settings.labelPosition == "top";
		    var labelTop =  top?"display:block;":("width: " + this._settings.labelWidth + "px;");
		    var label = "";
		    var labelHeight = top?this._labelTopHeight-2*this._borderWidth:( (webix.skin.$active.inputHeight||this._settings.aheight) - 2*this._settings.inputPadding);
		    if (config.label)
			    label = "<label style='"+labelTop+"text-align: " + labelAlign + ";' onclick='' for='"+id+"' class='webix_inp_"+(top?"top_":"")+"label "+(config.required?"webix_required":"")+"'>" + (config.label||"") + "</label>";
		    return label;
	    },
	    //get input element
	    getInputNode: function() {
		    return this._dataobj.getElementsByTagName('textarea')[0];
	    }
    }, webix.ui.text);
