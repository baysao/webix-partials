webix.protoUI({
	name:"datalayout",
	$init:function(){
		this.data.provideApi(this, true);
		this.data.attachEvent("onStoreUpdated", webix.bind(this.render, this));
	},
	_parse_cells:function(cells){
		if (!this._origin_cells){
			this._origin_cells = this._collection;
			this._collection = [{}];
		}

		return webix.ui.layout.prototype._parse_cells.call(this, this._collection);
	},
	_fill_data:function(view, prop){
		var obj, name = view._settings.name;
		if (name){
			if (name == "$value")
				obj = prop;
			else
				obj = prop[name];

			if (view.setValues) view.setValues(obj);
			else if (view.setValue) view.setValue(obj);
			else if (view.parse){
				//make copy of data for treestore parsers
				if (view.openAll)
					obj = webix.copy(obj);
				view.parse(obj);
			}
		} else {
			var collection = view._cells;
			if (collection)
				for (var i = 0; i < collection.length; i++)
					this._fill_data(collection[i], prop);
		}
	},
	render:function(id, obj, mode){
		if (id && mode === "update"){
			//update mode, change only part of layout
			var obj = this.getItem(id);
			var index = this.getIndexById(id);

			this._fill_data(this._cells[index], obj);
			return;
		}

		//full repainting
		var cells = this._collection = [];
		var order = this.data.order;
		var subcount = this._origin_cells.length;

		for (var i = 0; i < order.length; i++) {
		if (subcount)
				for (var j = 0; j < subcount; j++)
					cells.push(webix.copy(this._origin_cells[j]));
			else
				cells.push(this.getItem(order[i]));
		}

		if (!cells.length) cells.push({});

		this.reconstruct();

		if (subcount)
			for (var i = 0; i < order.length; i++) {
				var prop = this.getItem(order[i]);
				for (var j = 0; j < subcount; j++) {
					var view = this._cells[i*subcount + j];
					this._fill_data(view, prop);
				}
			}
	}
}, webix.DataLoader, webix.ui.layout);

webix.protoUI({
	$init:function(){
		webix.extend(this, webix.FlexLayout, true);
	},
	name:"flexdatalayout"
}, webix.ui.datalayout);
