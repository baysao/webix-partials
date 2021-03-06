webix.protoUI({
	name: "dbllist",
	defaults:{
		borderless:true
	},
	$init: function(config) {
		this._moved = {};
		this._inRight = webix.bind(function(obj){ return this._moved[obj.id]; }, this);
		this._inLeft = webix.bind(function(obj){ return !this._moved[obj.id]; }, this);
	
		this.$view.className += " webix_dbllist";
		this.$ready.unshift(this._setLayout);
	},
	$onLoad:function(data, driver){
		this._updateAndResize(function(){
			this.$$("left").data.driver = driver;
			this.$$("left").parse(data);
			this.$$("right").data.driver = driver;
			this.$$("right").parse(data);
		});

		this._refresh();
	},
	_getButtons:function(){
		if (this._settings.buttons === false)
			return { width: 10 };

		var i18n = webix.i18n.dbllist;
		var buttons = [
			this._getButton("deselect_all", i18n.deselectAll),
			this._getButton("select_all", i18n.selectAll),
			this._getButton("deselect_one", i18n.deselectOne),
			this._getButton("select_one", i18n.selectOne)
		];


		var buttons = { width:120, template:buttons.join(""), onClick:{
			dbllist_button:function(e, id, trg){
				 this.getTopParentView()._update_list(trg.getAttribute("action"));
			}
		}};
		if (this._settings.buttons)
			buttons.template = this._settings.buttons;

		return buttons;
	},
	_getButton: function(action, label){
		return "<button class='dbllist_button' action='"+action+"'>"+label+"</button>";
	},
	_getList: function(id, action, label, bottom){
		var list = {
			view: "list",
			select: "multiselect",
			multiselect: "touch",
			id: id,
			action: action,
			drag: true,
			type:{
				margin:3,
				id:id
			},
			on: {
				onBeforeDrop: function(context) {
					var source = context.from;
					var target = context.to;
					var top = source.getTopParentView();

					if (top === this.getTopParentView()) {
						var mode = (target._settings.action != "select_one");
						top.select(context.source, mode);
						top._refresh();
					}
					return false;
				},
				onItemDblClick: function(){
					return this.getTopParentView()._update_list(this.config.action);
				}
			}
		};

		if (this._settings.list)
			webix.extend(list, this._settings.list, true);

		if (label)
			list = { rows:[{ view:"label", label:label }, list] };
		if (bottom)
			return { rows:[list, { view:"label", height:20, label:bottom, css:"bottom_label" }] };
		return list;
	},
	_setLayout: function() {
		var cols = [{
			margin: 10, type:"clean",
			cols: [
				this._getList("left", "select_one", this._settings.labelLeft, this._settings.labelBottomLeft),
				this._getButtons(),
				this._getList("right", "deselect_one", this._settings.labelRight, this._settings.labelBottomRight)
			]
		}];

		this.cols_setter(cols);
	},
	_update_list: function(action) {
		var top = this;
		var id = null;
		var mode = false;

		if (action === "select_all"){
			id = top.$$("left").data.order;
			mode = true;
		} else if (action === "select_one"){
			id = top.$$("left").getSelectedId(true);
			mode = true;
		} else if (action === "deselect_all"){
			id = top.$$("right").data.order;
			mode = false;
		} else if (action === "deselect_one"){
			id = top.$$("right").getSelectedId(true);
			mode = false;
		}

		top.select(id, mode);
	},
	select:function(id, mode){
		var i;
		if (typeof id !== "object") id = [id];

		if (mode){
			for (i = 0; i < id.length; i++)
				this._moved[id[i]] = true;
		} else {
			for (i = 0; i < id.length; i++)
				delete this._moved[id[i]];
		}
		this.callEvent("onChange", []);
		this._refresh();
	},
	_updateAndResize:function(handler, size){
		webix.ui.$freeze = true;
		handler.call(this);
		webix.ui.$freeze = false;

		if (size && (this.$$("left")._settings.autoheight || this.$$("right")._settings.autoheight))
			this.resize();
	},
	_refresh: function() {
		var left = this.$$("left");
		var right = this.$$("right");

		if (left)
			this._updateAndResize(function(){
				left.filter(this._inLeft);
				right.filter(this._inRight);
			}, true);
	},
	focus:function(){
		webix.UIManager.setFocus(this);
	},
	value_setter:function(val){
		this.setValue(val);
	},
	setValue: function(value) {
		this._moved = {};
		if (typeof value !== "object")
			value = value.toString().split(",");
		for (var i = 0; i < value.length; i++)
			this._moved[value[i]] = true;

		
		this._refresh();
	},
	getValue: function() {
		var value = [];
		for (var key in this._moved)
			value.push(key);

		return value.join(",");
	}
}, webix.AtomDataLoader, webix.IdSpace, webix.ui.layout);
