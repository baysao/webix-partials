




webix.protoUI({
	name:"property",
	$init:function(){
		this._contentobj.className+=" webix_property";
		this._contentobj.setAttribute("role", "listbox");
        this._destroy_with_me = [];
	},
	defaults:{
		nameWidth:100,
		editable:true
	},
	on_render:{
		checkbox:function(value, config){
			return  "<input type='checkbox' class='webix_property_check' "+(value?"checked":"")+">";
		},
		color:function(value, config){
			return  "<div class=\"webix_property_col_val\"><div class='webix_property_col_ind' style=\"background-color:"+(value||"#FFFFFF")+";\"></div><span>" +value+"</span></div>";
		}
	},
	on_edit:{
		label:false
	},
	_id:"webix_f_id",
	on_click:{
		webix_property_check:function(ev){
			var id = this.locate(ev);
			this.getItem(id).value = !this.getItem(id).value;
			this.callEvent("onCheck",[id, this.getItem(id).value]);
			return false;
		}
	},
	on_dblclick:{
	},
	registerType:function(name, data){
		if (data.template)
			this.on_render[name] = data.template;
		if (data.editor)
			this.on_edit[name] = data.editor;
		if (data.click)
			for (var key in data.click)
				this.on_click[key] = data.click[key];
	},
    elements_setter:function(data){
        this._idToLine = {};
        for(var i =0; i < data.length; i++){
            var line = data[i];
            if (line.type == "multiselect")
            	line.optionslist = true;

            //line.type 	= 	line.type||"label";
            line.id 	=	line.id||webix.uid();
            line.label 	=	line.label||"";
            line.value 	=	line.value||"";
            this._idToLine[line.id] = i;
            this.template = this._map_options(data[i]);
        }
        return data;
    },
	showItem:function(id){
		webix.RenderStack.showItem.call(this, id);
	},
	locate:function(e){
		return webix.html.locate(arguments[0], this._id);
	},
	getItemNode:function(id){
		return this._dataobj.childNodes[this._idToLine[id]];
	},
	getItem:function(id){
		return this._settings.elements[this._idToLine[id]];
	},
	_get_editor_type:function(id){
		var type = this.getItem(id).type;
		if (type == "checkbox") return "inline-checkbox";
		var alter_type = this.on_edit[type];
		return (alter_type === false)?false:(alter_type||type);
	},
	_get_edit_config:function(id){
		return this.getItem(id);
	},
	_find_cell_next:function(start, check , direction){
		var row = this._idToLine[start.id];
		var order = this._settings.elements;
		
		if (direction){
			for (var i=row+1; i<order.length; i++){
				if (check.call(this, order[i].id))
					return order[i].id;
			}
		} else {
			for (var i=row-1; i>=0; i--){
				if (check.call(this, order[i].id))
					return order[i].id;
			}
		}

		return null;
	},
	updateItem:function(key, data){
		data = data || {};

		var line = this.getItem(key);
		if (line)
			webix.extend(line, data, true);

		this.refresh();
	},
	_cellPosition:function(id){
		var html = this.getItemNode(id);
		return {
			left:html.offsetLeft+this._settings.nameWidth,
			top:html.offsetTop,
			height:html.firstChild.offsetHeight,
			width:this._data_width,
			parent:this._contentobj
		};
	},
	setValues:function(data, update){
		if (this._settings.complexData)
			data = webix.CodeParser.collapseNames(data);

		if(!update) this._clear();
		for(var key in data){
			var line = this.getItem(key);
			if (line)
				line.value = data[key];
		}
		
		this._props_dataset = data;
		this.refresh();
	},
	_clear:function(){
		var lines = this._settings.elements;
		for (var i=0; i<lines.length; i++)
			lines[i].value = "";
	},
	getValues:function(){
		var data = webix.clone(this._props_dataset||{});
		for (var i = 0; i < this._settings.elements.length; i++) {
			var line = this._settings.elements[i];
			if (line.type != "label")
				data[line.id] = line.value;
		}

		if (this._settings.complexData)
			data = webix.CodeParser.expandNames(data);

		return data;
	},
	refresh:function(){
		this.render();
	},
	$setSize:function(x,y){
		if (webix.ui.view.prototype.$setSize.call(this, x, y)){
			this._data_width = this._content_width - this._settings.nameWidth;
			this.render();
		}
	},
	$getSize:function(dx,dy){
		if (this._settings.autoheight){
			var count = this._settings.elements.length;
			this._settings.height = Math.max(this.type.height * count,this._settings.minHeight||0);
		}
		return webix.ui.view.prototype.$getSize.call(this, dx, dy);
	},
	_toHTML:function(){
		var html = [];
		var els = this._settings.elements;
		if (els)
			for (var i=0; i<els.length; i++){
				var data = els[i];
				if (data.css && typeof data.css == "object")
					data.css = webix.html.createCss(data.css);

				var pre = '<div webix_f_id="'+data.id+'"'+(data.type!=='label'?'role="option" tabindex="0"':'')+' class="webix_property_line '+(data.css||'')+'">';
				if (data.type == "label")
					html[i] = pre+"<div class='webix_property_label_line'>"+data.label+"</div></div>";
				else {
					var render = this.on_render[data.type],
                        content;
					var post = "<div class='webix_property_label' style='width:"+this._settings.nameWidth+"px'>"+data.label+"</div><div class='webix_property_value' style='width:"+this._data_width+"px'>";
                    if(data.collection || data.options){
                        content = data.template(data, data.value);
                    }else if(data.format)
                        content = data.format(data.value);
                    else
                        content = data.value;
					if (render)
						content = render.call(this, data.value, data);
					html[i] = pre+post+content+"</div></div>";
				}
			}
		return html.join("");
	},
	type:{
		height:24,
		templateStart:webix.template(""),
		templateEnd:webix.template("</div>")
	},
	$skin: function(){
		this.type.height = webix.skin.$active.propertyItemHeight||24;
	}
}, webix.AutoTooltip, webix.EditAbility, webix.MapCollection, webix.MouseEvents, webix.Scrollable, webix.SingleRender, webix.AtomDataLoader, webix.EventSystem, webix.ui.view);
