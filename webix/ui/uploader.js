
/*
	UI:Uploader
*/





webix.type(webix.ui.list, {
	name:"uploader",
	template:"#name#  {common.removeIcon()}{common.percent()}<div style='float:right'>#sizetext#</div>",
	percent:function(obj){
		if (obj.status == 'transfer')
			return "<div style='width:60px; text-align:center; float:right'>"+obj.percent+"%</div>";
		return "<div class='webix_upload_"+obj.status+"'><span class='"+(obj.status =="error"?"error_icon":"fa-check webix_icon")+"'></span></div>";
	},
	removeIcon:function(obj){
		return "<div class='webix_remove_upload'><span class='cancel_icon'></span></div>";
	},
	on_click:{
		"webix_remove_upload":function(ev, id){
			webix.$$(this.config.uploader).files.remove(id);
		}
	}
});


webix.protoUI({
	name:"uploader",
	defaults:{
		autosend:true,
		multiple:true,
		inputName:"upload"
	},
	$cssName:"button",
	_allowsClear:true,
	on_click:{
		//don't fire extra onItemClick events, visible button will do it
		"webix_hidden_upload":function(){ return false; }
	},
	//will be redefined by upload driver
	send:function(){},
	fileDialog:function(){},
	stopUpload:function(){},

	$init:function(config){
		var driver = webix.UploadDriver.html5;
		this.files = new webix.DataCollection();

		// browser doesn't support XMLHttpRequest2
		if (webix.isUndefined(XMLHttpRequest) || webix.isUndefined((new XMLHttpRequest()).upload))
			driver = webix.UploadDriver.flash;

		webix.assert(driver,"incorrect driver");
		webix.extend(this, driver, true);
	},
	$setSize:function(x,y){
		if (webix.ui.view.prototype.$setSize.call(this,x,y)){
			this.render();
		}
	},
	apiOnly_setter:function(value){
		webix.delay(this.render, this);
		return (this.$apiOnly=value);
	},
	_add_files: function(files){
		for (var i = 0; i < files.length; i++)
			this.addFile(files[i]);

	},
	link_setter:function(value){
		if (value)
			webix.delay(function(){
				var view = webix.$$(this._settings.link);
				if (!view){
					var top = this.getTopParentView();
					if (top.$$)
						view = top.$$(this._settings.link);
				}

				if (view.sync && view.filter)
					view.sync(this.files);
				else if (view.setValues)
					this.files.data.attachEvent("onStoreUpdated", function(){
						view.setValues(this);
					});
				view._settings.uploader = this._settings.id;
			}, this);
		return value;
	},
	addFile:function(name, size, type, extra){
		var file = null;
		if (typeof name == "object"){
			file = name;
			name = file.name;
			size = file.size;
		}

		var format = this._format_size(size);
		type = type || name.split(".").pop();

		var file_struct = {
			file: file,
			name: name,
			id: webix.uid(),
			size: size,
			sizetext: format,
			type: type,
			context: this._last_file_context,
			status: "client"
		};

		if (this._settings.directory && file.webkitRelativePath)
			file_struct.name = file.webkitRelativePath;

		if (extra)
			webix.extend(file_struct, extra, true);

		if (this.callEvent("onBeforeFileAdd", [file_struct])){
			if (!this._settings.multiple)
				this.files.clearAll();

			var id = this.files.add(file_struct);
			this.callEvent("onAfterFileAdd", [file_struct]);
			if (id && this._settings.autosend)
				this.send(id);
		}
		
		return file_struct;
	},
	
	_get_active_url:function(item){
		var url = this._settings.upload;
		var urldata = webix.extend(item.urlData||{},this._settings.urlData||{});
		if (url && urldata){
			var subline = [];
			for (var key in urldata)
				subline.push(encodeURIComponent(key)+"="+encodeURIComponent(urldata[key]));

			if (subline.length)
				url += ((url.indexOf("?") ==-1) ? "?" : "&") + subline.join("&");
		}
		return url;
	},

	addDropZone:function(id, hover_text){
		var node = webix.toNode(id);
		var extra_css = "";
		if (hover_text)
			extra_css = " "+webix.html.createCss({ content:'"'+hover_text+'"' }, ":before");

		var fullcss = "webix_drop_file"+extra_css;
		var timer = null;

		//web
		webix._event(node,"dragover", webix.html.preventEvent);
		webix._event(node,"dragover", function(e){
			webix.html.addCss(node, fullcss, true);
			if (timer){
				clearTimeout(timer);
				timer = null;
			}
		});
		webix._event(node,"dragleave", function(e){
			//when moving over html child elements
			//browser will issue dragleave and dragover events
			//ignore first one
			timer = setTimeout(function(){
				webix.html.removeCss(node, fullcss);
			}, 150);
		});

		webix._event(node,"drop", webix.bind(function(e){
			webix.html.removeCss(node, fullcss);
			this._drop(e);
			return webix.html.preventEvent(e);
		}, this));
	},
	
	_format_size: function(size) {
		var index = 0;
		while (size > 1024){
			index++;
			size = size/1024;
		}
		return Math.round(size*100)/100+" "+webix.i18n.fileSize[index];
	},

	_complete: function(id, response) {
		if (response.status != 'error') {
			var item = this.files.getItem(id);

			item.status = "server";
			item.progress = 100;
			webix.extend(item, response, true);

			this.callEvent("onFileUpload", [item, response]);
			this.callEvent("onChange", []);
			this.files.updateItem(id);
		}
		
		if (this.isUploaded())
			this._upload_complete(response);
	},
	_upload_complete:function(response){
		this.callEvent("onUploadComplete", [response]);
		if (this._last_assigned_upload_callback){
			this._last_assigned_upload_callback.call(this, response);
			this._last_assigned_upload_callback = 0;
		}
	},
	isUploaded:function(){
		var order = this.files.data.order;
		for (var i=0; i<order.length; i++)
			if (this.files.getItem(order[i]).status != "server")
				return false;

		return true;
	},
	$onUploadComplete: function(){

	},
	$updateProgress: function(id, percent) {
		var item = this.files.getItem(id);
		item.percent = Math.round(percent);
		this.files.updateItem(id);
	},
	setValue:function(value){
		if (typeof value == "string" && value)
			value = { value:value, status:"server" };

		this.files.clearAll();
		if (value)
			this.files.parse(value);

		this.callEvent("onChange", []);
	},
	getValue:function(){
		var data = [];
		this.files.data.each(function(obj){
			if (obj.status == "server")
				data.push(obj.value||obj.name);
		});

		return data.join(",");
	}

}, webix.ui.button);
