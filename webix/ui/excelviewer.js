
webix.protoUI({
	name: "excelbar",
	defaults:{
		padding:0,
		type:"line"
	},
	$init:function(config){
		config.cols = [
			{ view:"tabbar", options:[""], optionWidth:200, on:{
				onaftertabclick:function(){
					this.getParentView().callEvent("onExcelSheetSelect", [this.getValue()]);
				}
			}}
		];
	},
	getValue:function(){
		return this.getInput().getValue();
	},
	setValue:function(value){
		return this.getInput().setValue(value);
	},
	getInput:function(){
		return this.getChildViews()[0];
	},
	setSheets:function(sheets){
		var input = this.getInput();
		input.config.options = sheets;
		input.refresh();
	}
}, webix.ui.toolbar);

webix.protoUI({
	name:"excelviewer",
	$init:function(){
		this.$ready.push(function(){
			if (this._settings.toolbar)
				webix.$$(this._settings.toolbar).attachEvent("onExcelSheetSelect", webix.bind(this.showSheet, this));
		});
	},
	defaults:{
		datatype:"excel"
	},
	$onLoad:function(data){
		if(data.sheets){
			this._excel_data = data;
			if (this._settings.toolbar)
				webix.$$(this._settings.toolbar).setSheets(data.names);
			var now = data.names[0];
			this.showSheet(now.id || now);
			return true;
		}
		return false;
	},
	showSheet:function(name){
		this.clearAll();

		var obj = this.data.driver.sheetToArray(this._excel_data.sheets[name], {
			spans:this._settings.spans
		});

		var header = this._settings.excelHeader;
		var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

		if (!header){
			header = webix.copy(obj.data[0]);
			for (var i = 0; i < header.length; i++)
				header[i] = { header:letters[i], id:"data"+i, adjust:true, editor:"text", sort:"string" };
		} else if (header === true) {
			header = obj.data.splice(0,1)[0];
			for (var i = 0; i < header.length; i++)
				header[i] = { header:header[i], id:"data"+i, adjust:true, editor:"text", sort:"string" };
		} else
			header = webix.copy(header);

		this.config.columns = header;
		this.refreshColumns();

		this.parse(obj, this._settings.datatype);
		
		if(this._settings.spans && obj.spans)
			this._paintSpans(obj.spans);
	},
	_paintSpans:function(spans){
		if (spans.length){
			this._spans_pull = {};
			for(var i = 0; i<spans.length; i++){
				if(this.config.excelHeader)
					spans[i][0]--;
				if(spans[i][0] >= 0){
					spans[i][0] = this.getIdByIndex(spans[i][0]);
					spans[i][1] = "data"+spans[i][1];
				}
			}
			this.addSpan(spans);
			this.refresh();
		}
	}
}, webix.ui.datatable);
