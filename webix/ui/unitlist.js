webix.protoUI({
	name:"unitlist",
	_id:"webix_item_id",
	uniteBy_setter: webix.template,
   	render:function(id,data,type,after){
		var config = this._settings;
		if (!this.isVisible(config.id))
			return;
		if (webix.debug_render)
			webix.log("Render: "+this.name+"@"+config.id);
		if(!config.uniteBy){
			if (webix.debug_render){
				webix.log("uniteBy is undefined");
			}
			return false;
		}
		if (id){
			var cont = this.getItemNode(id); //get html element of updated item
            if(cont&&type=="update"&&(this._settings.uniteBy.call(this,data)==this.getItem(id).$unitValue)){
                var t = this._htmlmap[id] = this._toHTMLObject(data);
				webix.html.insertBefore(t, cont);
				webix.html.remove(cont);
				return;
			}
		}
		//full reset
		if (this.callEvent("onBeforeRender",[this.data])){
			this.units = null;
			this._setUnits();
			if(this.units){
				this._dataobj.innerHTML = this._getUnitRange().map(this._toHTML, this).join("");
				this._htmlmap = null; 
			}
			this.callEvent("onAfterRender",[]);
		}
	},
	getUnits:function(){
		var result = [];
		if(this.units){
			for(var b in this.units){
				result.push(b);
			}
		}
		return result;	
	},
	getUnitList:function(id){
		return (this.units?this.units[id]:null);
	},
	_toHTML:function(obj){
		//check if related template exist
		var mark = this.data._marks[obj.id];
		webix.assert((!obj.$template || this.type["template"+obj.$template]),"RenderStack :: Unknown template: "+obj.$template);
		this.callEvent("onItemRender",[obj]);
		if(obj.$unit){
			return this.type.templateStartHeader(obj,this.type)+this.type.templateHeader.call(this,obj.$unit)+this.type.templateEnd(obj, this.type);
		}
		return this.type.templateStart(obj,this.type,mark)+(obj.$template?this.type["template"+obj.$template]:this.type.template)(obj,this.type)+this.type.templateEnd(obj, this.type);
	},
	_getUnitRange:function(){
		var data,i,u,unit;
		data = [];
		var min = this.data.$min || 0;
		var max = this.data.$max || Infinity;
		var count = 0;

		for(u in this.units){
			data.push({$unit:u});
			unit = this.units[u];
			for(i=0;i < unit.length;i++){
				if (count == min) data = [{$unit:u}];
				data.push(this.getItem(unit[i]));
				if (count == max) return webix.toArray(data);
				count++;
			}
		}

		return webix.toArray(data);
	},
	_setUnits: function(){
		var list = this;
		this.units = {};
		this.data.each(function(obj){
			var result = list._settings.uniteBy.call(this,obj);
            obj.$unitValue = result;
            if(!list.units[result])
				list.units[result] = [];
			list.units[result].push(obj.id);
		});
	},
	type:{
		headerHeight: 20,
		templateHeader: function(value){
			return "<span class='webix_unit_header_inner'>"+value+"</span>";
		},
		templateStart:function(obj,type,marks){
			if(obj.$unit)
				return type.templateStartHeader.apply(this,arguments);
			var className = "webix_list_item webix_list_"+(type.css)+"_item"+((marks&&marks.webix_selected)?" webix_selected":"")+(obj.$css?obj.$css:"");
			var style = "width:"+type.widthSize(obj,type,marks)+"; height:"+type.heightSize(obj,type,marks)+"; overflow:hidden;"+(type.layout&&type.layout=="x"?"float:left;":"");
			return '<div webix_item_id="'+obj.id+'" class="'+className+'" style="'+style+'" '+type.aria(obj, type, marks)+'>';
		},
		templateStartHeader:function(obj,type,marks){
			var className = "webix_unit_header webix_unit_"+(type.css)+"_header"+(obj.$selected?"_selected":"");
			var style = "width:"+type.widthSize(obj,type,marks)+"; height:"+type.headerHeight+"px; overflow:hidden;";
			return '<div webix_unit_id="'+obj.$unit+'" class="'+className+'" style="'+style+'">';
		}
	},
	$skin:function(){
		this.type.headerHeight = webix.skin.$active.unitHeaderHeight||20;
	}
}, webix.ui.list);
