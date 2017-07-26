define(["webix/core/webix"], function webix_list(webix){
webix.protoUI({
	    name:"list",
	    _listClassName : "webix_list",
	    _itemClassName:"webix_list_item",
	    $init:function(config){
		    webix.html.addCss(this._viewobj, this._listClassName + (((config.layout||this.defaults.layout) == "x")?"-x":"") );
		    this.data.provideApi(this,true);

		    this._auto_resize = webix.bind(this._auto_resize, this);
		    this.data.attachEvent("onStoreUpdated", this._auto_resize);
		    this.data.attachEvent("onSyncApply", this._auto_resize);
		    this.attachEvent("onAfterRender", this._correct_width_scroll);

		    this._viewobj.setAttribute("role", "listbox");
	    },
	    $dragHTML:function(obj, e){
		    if (this._settings.layout == "y" && this.type.width == "auto"){
			    this.type.width = this._content_width;
			    var node = this._toHTML(obj);
			    this.type.width = "auto";
			    return node;
		    }
		    return this._toHTML(obj);
	    },
	    defaults:{
		    select:false,
		    scroll:true,
		    layout:"y",
		    navigation:true
	    },
	    _id:"webix_l_id",
	    on_click:{
		    webix_list_item:function(e,id){
			    if (this._settings.select){
                    this._no_animation = true;
				    if (this._settings.select=="multiselect"  || this._settings.multiselect)
					    this.select(id, false, (e.ctrlKey || e.metaKey || (this._settings.multiselect == "touch")), e.shiftKey); 	//multiselection
				    else
					    this.select(id);
                    this._no_animation = false;
			    }
		    }
	    },
	    on_dblclick:{
	    },
	    getVisibleCount:function(){
		    return Math.floor(this._content_height / this._one_height());
	    },
	    _auto_resize:function(){
		    if (this._settings.autoheight || this._settings.autowidth)
			    this.resize();
	    },
	    _auto_height_calc:function(count){
		    var value = this.data.$pagesize||this.count();

		    this._onoff_scroll(count && count < value);
		    if (this._settings.autoheight && value < (count||Infinity) ) 
			    count = value;
		    var height = this._one_height() * count + (this.type.margin||0);
		    //unitlist
		    if(this.getUnits)
			    height += this.getUnits().length*this.type.headerHeight;

		    return Math.max(height,this._settings.minHeight||0);
	    },
	    _one_height:function(){
		    return this.type.height + (this.type.margin||0);
	    },
	    _auto_width_calc:function(count){
		    var value = this.data.$pagesize||this.count();

		    this._onoff_scroll(count && count < value);
		    if (this._settings.autowidth && value < (count||Infinity) ) 
			    count = value;

		    return (this.type.width * count); 
	    },
	    _correct_width_scroll:function(){
		    if (this._settings.layout == "x")
			    this._dataobj.style.width = (this.type.width != "auto") ? (this.type.width * this.count() + "px") : "auto";
	    },
	    $getSize:function(dx,dy){
		    if (this._settings.layout == "y"){
			    if (this.type.width!="auto")
				    this._settings.width = this.type.width + (this._scroll_y?webix.ui.scrollSize:0);
			    if (this._settings.yCount || this._settings.autoheight)
				    this._settings.height = this._auto_height_calc(this._settings.yCount)||1;
		    }
		    else {
			    if (this.type.height!="auto")
				    this._settings.height = this._one_height() + (this._scroll_x?webix.ui.scrollSize:0);
			    if (this._settings.xCount || this._settings.autowidth)
				    this._settings.width = this._auto_width_calc(this._settings.xCount)||1;
		    }
		    return webix.ui.view.prototype.$getSize.call(this, dx, dy);
	    },
	    $setSize:function(){
            webix.ui.view.prototype.$setSize.apply(this, arguments);
	    },
	    type:{
		    css:"",
		    widthSize:function(obj, common){
			    return common.width+(common.width>-1?"px":"");
		    },
		    heightSize:function(obj, common){
			    return common.height+(common.height>-1?"px":"");
		    },
		    classname:function(obj, common, marks){
			    var css = "webix_list_item";
			    if (obj.$css){
				    if (typeof obj.$css == "object")
					    obj.$css = webix.html.createCss(obj.$css);
				    css += " "+obj.$css;
			    }
			    if (marks && marks.$css)
				    css += " "+marks.$css;

			    return css;
		    },
		    aria:function(obj, common, marks){
			    return 'role="option"'+(marks && marks.webix_selected?' aria-selected="true" tabindex="0"':' tabindex="-1"')+(obj.$count && obj.$template?'aria-expanded="true"':'');
		    },
		    template:function(obj){
			    return (obj.icon?("<span class='webix_icon fa-"+obj.icon+"'></span> "):"") + obj.value + (obj.badge?("<div class='webix_badge'>"+obj.badge+"</div>"):"");
		    },
		    width:"auto",
		    templateStart:webix.template('<div webix_l_id="#id#" class="{common.classname()}" style="width:{common.widthSize()}; height:{common.heightSize()}; overflow:hidden;" {common.aria()}>'),
		    templateEnd:webix.template("</div>")
	    },
	    $skin:function(){
		    this.type.height = webix.skin.$active.listItemHeight;
	    }
    }, webix.CustomPrint, webix.KeysNavigation, webix.DataMove, webix.DragItem, webix.MouseEvents, webix.SelectionModel, webix.Scrollable, webix.ui.proto, webix.CopyPaste);

    webix.type(webix.ui.list, {
	    name:"multilist",
	    templateStart:webix.template('<div webix_l_id="#!id#" class="{common.classname()}" style="width:{common.widthSize()}; height:{common.heightSize()}; overflow:hidden;" {common.aria()}>')
    }, "default");

    webix.type(webix.ui.list, {
	    name:"checklist",
	    templateStart:webix.template('<div webix_l_id="#!id#" {common.aria()} class="{common.classname()}" style="width:{common.widthSize()}; height:{common.heightSize()}; overflow:hidden; white-space:nowrap;">{common.checkbox()}'),
	    checkbox: function(obj, common){
		    var icon = obj.$checked?"fa-check-square":"fa-square-o";
		    return "<span role='checkbox' tabindex='-1' aria-checked='"+(obj.$checked?"true":"false")+"' class='webix_icon "+icon+"'></span>";
	    },
	    aria:function(obj){
		    return "role='option' tabindex='-1' "+(obj.$checked?"aria-selected='true'":"");
	    },
	    template: webix.template("#value#")
    }, "default");

return webix;
});
