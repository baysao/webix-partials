
    webix.protoUI({
	    name:"label",
	    defaults:{
		    template:"<div style='height:100%;line-height:#cheight#px'>#label#</div>"
	    },
	    $skin:function(){
		    this.defaults.height = webix.skin.$active.inputHeight;
	    },
	    focus:function(){ return false; },
	    _getBox:function(){
		    return this._dataobj.firstChild;
	    },
	    setHTML:function(html){
		    this._settings.template = function(){ return html; };
		    this.refresh();
	    },
	    setValue: function(value){
		    this._settings.label = value;
		    webix.ui.button.prototype.setValue.apply(this,arguments);
	    },
	    $setValue:function(value){
		    this._dataobj.firstChild.innerHTML = value;
	    },
	    _set_inner_size:function(){}
    }, webix.ui.button);
