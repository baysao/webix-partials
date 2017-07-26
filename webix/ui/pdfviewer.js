
webix.protoUI({
	name:"pdfviewer",
	defaults:{
		scale:"auto"
	},
	$init:function(config){
		this.$view.className += " webix_pdf";

		var elm_wrapper = document.createElement("DIV");
		elm_wrapper.className="canvas_wrapper";

		var elm = document.createElement("canvas");

		this._currentPage = this.$view;
		this._container = this.$view.appendChild(elm_wrapper);
        this._canvas = this._container.appendChild(elm);
        
        this.$pdfDoc = null;
		this.$pageNum = 0;
		this.$numPages = 0;
		this._pageRendering = false;
		this._pageNumPending = null;
		this._ctx = this._canvas.getContext('2d');

        this._init_scale_value = 0.1;
		this._default_scale_delta = config.scaleDelta || 1.1;
		this._min_scale = config.minScale || 0.25;
		this._max_scale = config.maxScale || 10.0;
		this._max_auto_scale = 1.25;

		this._hPadding = 40;
		this._vPadding = 10;

		this.$ready.push(this._attachHandlers);
	},
	toolbar_setter:function(toolbar){
		if (typeof toolbar == "string"){
			var ui_toolbar = webix.$$(toolbar);
			if (ui_toolbar){
				ui_toolbar.$master = this;
				ui_toolbar.refresh();
			}
			this.attachEvent("onDocumentReady", function(){
				if(ui_toolbar){
					ui_toolbar.setPage(this.$pageNum);
					ui_toolbar.setValues(this.$numPages, this._settings.scale);
				}
				else
					this.toolbar_setter(toolbar);
			});
			return toolbar;
		}
	},
	_attachHandlers:function(){
		delete this._settings.datatype; // cheat(

		this.attachEvent("onScaleChange", function(scale, update){
			if(update && this._settings.toolbar && webix.$$(this._settings.toolbar).setScale)
				webix.$$(this._settings.toolbar).setScale(scale);
		});

		if(webix.env.touch){
			this._touchDelta = false;

			webix._event(this._viewobj, "touchstart", webix.bind(function(e){
				var touches = e.targetTouches;
				if(touches.length === 2){
					webix.html.preventEvent(e);
					this._touchDelta = Math.abs(touches[0].pageY - touches[1].pageY);
				}
			}, this));

			webix._event(this.$view, "touchmove", webix.bind(function(e){
				var touches = e.targetTouches;

				if(touches.length === 2 && this._touchDelta !== false){
					webix.html.preventEvent(e);

					if(Math.abs(touches[0].pageY - touches[1].pageY)>this._touchDelta)
						this.zoomIn();
					else
						this.zoomOut();
					this._touchDelta = false;
				}
			}, this));

			this.attachEvent("onSwipeX", function(start, end){
				this.$view.scrollLeft = this.$view.scrollLeft - (end.x-start.x);
			});

			this.attachEvent("onSwipeY", function(start, end){
				var ch = this.$view.clientHeight,
					sh = this.$view.scrollHeight,
					oh = this.$view.offsetHeight,
					stop = this.$view.scrollTop,
					delta = end.y-start.y;

				if(ch === sh || (delta<0 && stop > (sh - oh)) || (delta>0 && stop === 0)){
					var page = this.$pageNum + (delta > 0 ? -1 :1);
					if(page>0 && page <=this.$numPages){
						this.$pageNum = page;
						this._queueRenderPage(this.$pageNum);
						this.$view.scrollTop = delta > 0 ? sh : 0;
					}
				}
				else
					this.$view.scrollTop = stop - delta;
			});
		}
		else{
			var evt = webix.env.isFF?"DOMMouseScroll":"mousewheel";
			webix.event(window, evt, webix.bind(function(e){
				var ticks = (e.type === 'DOMMouseScroll') ? -e.detail :e.wheelDelta;
				var dir = (ticks < 0) ? 'out' : 'in';
				if (e.ctrlKey) { // Only zoom the pages, not the entire viewer
					webix.html.preventEvent(e);
				if(dir == "in")
					this.zoomIn();
				else
					this.zoomOut();
				}
			}, this));
		}
	},
	_getDocument:function(data){
		if(data.name){ //File structure
			var reader = new FileReader();
			reader.onload = webix.bind(function (e) {
				this._getDocument({data:e.target.result});
			}, this);
			reader.readAsArrayBuffer(data);
		}
		else{
			PDFJS.getDocument({data:data.data}).then(webix.bind(function (pdfDoc_) {
				this.clear();
				this.$pdfDoc = pdfDoc_;
				this.$numPages = this.$pdfDoc.numPages;
				this.$pageNum = 1;

				this._renderPage(this.$pageNum).then(webix.bind(function(){
					this.callEvent("onDocumentReady");
				}, this));
			}, this));
		}
	},
	$onLoad:function(data){
		if(!window.PDFJS){
			//for cross browser and compatibility
			webix.require([webix.cdn + "/extras/pdfjs/compatibility.min.js", webix.cdn + "/extras/pdfjs/pdf.min.js"], function(){
				PDFJS.workerSrc = webix.cdn + "/extras/pdfjs/pdf.worker.min.js";
				this._getDocument(data);
			}, this);
		}
		else
			this._getDocument(data);
		return true;
	},
	_getViewPort:function(page, scale){
		var viewport = page.getViewport(scale);
		this._canvas.height = viewport.height;
		this._canvas.width = viewport.width;
		this._container.style.width = viewport.width+"px";
		this._container.style.height = viewport.height+"px";

		return viewport;
	},
	_renderPage:function(num) {
		var viewer = this;
		viewer._pageRendering = true;
		// Using promise to fetch the page
		return this.$pdfDoc.getPage(num).then(function(page) {
			//Getting 'safe' scale value
			var scale = isNaN(parseFloat(viewer._settings.scale))?viewer._init_scale_value:viewer._settings.scale;
            
            var viewport = viewer._getViewPort(page, scale);
            //recalc viewport if "string" scale is set
			if(scale !== viewer._settings.scale){
                scale =  viewer._getScale(viewer._settings.scale);
				viewport = viewer._getViewPort(page, scale);
                viewer._settings.scale = scale;
            }

			// Render PDF page into canvas context
			var renderContext = {
				canvasContext: viewer._ctx,
				viewport: viewport
			};

			page.cleanupAfterRender = true;

			// Wait for rendering to finish
			return page.render(renderContext).promise.then(function () {
				viewer.callEvent("onPageRender", [viewer.$pageNum]);
				viewer._pageRendering = false;
				
				if (viewer._pageNumPending !== null) {
					// New page rendering is pending
					viewer._renderPage(viewer._pageNumPending);
					viewer._pageNumPending = null;
				}
			});
		});
	},
	_queueRenderPage:function(num) {
		if (this._pageRendering)
			this._pageNumPending = num;
		else
			this._renderPage(num);
	},
	renderPage:function(num){
		if(!this.$pdfDoc || num<0 || num>this.$numPages)
			return;

		this.$pageNum = num;
		this._queueRenderPage(this.$pageNum);
	},
	prevPage:function() {
		if (this.$pageNum <= 1)
			return;
		this.$pageNum--;
		this._queueRenderPage(this.$pageNum);
	},
	nextPage:function() {
		if(this.$pageNum >= this.$numPages)
			return;
		this.$pageNum++;
		this._queueRenderPage(this.$pageNum);
	},
	zoomIn: function (){
		var newScale = this._settings.scale;

        newScale = (newScale * this._default_scale_delta).toFixed(2);
        newScale = Math.ceil(newScale * 10) / 10;
        newScale = Math.min(this._max_scale, newScale);
        this.setScale(newScale, true);
	},
	zoomOut: function (){
		var newScale = this._settings.scale;

        newScale = (newScale / this._default_scale_delta).toFixed(2);
        newScale = Math.floor(newScale * 10) / 10;
        newScale = Math.max(this._min_scale, newScale);

        this.setScale(newScale, true);
	},
    _getScale:function(value){
        if(!isNaN(parseFloat(value)))
            return value;
        if(isNaN(parseFloat(this._settings.scale)))
            this._settings.scale = this._init_scale_value;

        var scale = 1; //default value
        var pageWidthScale = ((this._currentPage.clientWidth - this._hPadding) * this._settings.scale/this._canvas.clientWidth).toFixed(2);
        var pageHeightScale = ((this._currentPage.clientHeight - this._vPadding) * this._settings.scale/this._canvas.clientHeight).toFixed(2);
        switch (value) {
            case 'page-actual':
                scale = 1;
                break;
            case 'page-width':
                scale = pageWidthScale;
                break;
            case 'page-height':
                scale = pageHeightScale;
                break;
            case 'page-fit':
                scale = Math.min(pageWidthScale, pageHeightScale);
                break;
            case 'auto':
                var isLandscape = (this._currentPage.clientWidth > this._currentPage.clientHeight);
                var horizontalScale = isLandscape ?  Math.min(pageHeightScale, pageWidthScale) : pageWidthScale;
                scale = Math.min(this._max_auto_scale, horizontalScale);
                break;
        }
        return scale;
    },
    setScale: function(value, update) {
		if (!isNaN(parseFloat(value))) {
			this._setScale(value, update);
		} else {
			var scale = this._getScale(value);
            this._setScale(scale, update);
        }
    },
    _setScale:function(newScale, update){
		this._settings.scale = newScale;
		this.renderPage(this.$pageNum);

		this.callEvent("onScaleChange", [newScale, update]);
    },
    download:function(){
		if(!this.$pdfDoc) return;
		
		var filename = (this._settings.downloadName || "document")+".pdf";
		this.$pdfDoc.getData().then(function(data){
			var blob = PDFJS.createBlob(data, 'application/pdf');
			webix.html.download(blob, filename);
		});
    },
    clear:function(){
		if(this.$pdfDoc){
			this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
			this._container.style.height = this._container.style.width = this._canvas.width = this._canvas.height = 0;
			this._settings.scale = "auto";
			this.$pageNum = this.$numPages = 0;
			this.$pdfDoc.transport.startCleanup();
			this.$pdfDoc.destroy();
			this.$pdfDoc = null;

			if(this._settings.toolbar && webix.$$(this._settings.toolbar))
				webix.$$(this._settings.toolbar).reset();
		}
    }
}, webix.EventSystem, webix.AtomDataLoader, webix.ui.view);

webix.protoUI({
	name: "pdfbar",
	reset:function(){
		this.setPage(0);
		this.setValues(0, "auto");
	},
	$init:function(config){
		this.$view.className +=" pdf_bar";
		
		config.cols = [
			{ view:"button", type:"icon", icon:"arrow-left", width:35, click:function(){ this.getParentView()._navigate("prev");}},
			{ view:"text", width:70, value:"0", on:{
				onBlur:function(){ this.getParentView()._navigate(this.getValue());},
				onKeyPress:function(code){ if(code === 13) this.getParentView()._navigate(this.getValue());}
			}},
			{ template:webix.i18n.PDFviewer.of+" #limit#", width:70, data:{limit:0}, borderless:true },
			{ view:"button", type:"icon", icon:"arrow-right", width:35, click:function(){ this.getParentView()._navigate("next");}},
			{},
			{view:"button", type:"icon", icon:"minus", width:35, click:function(){ this.getParentView().zoom("out");}},
			{view:"richselect", options:[], maxWidth:195, suggest:{
				padding:0, css:"pdf_opt_list", borderless:true, body:{
					type:{ height:25}, scroll:false, yCount:13 }
				},
				on:{ onChange:function(){ this.getParentView().setMasterScale(this.getValue());}}
			},
			{view:"button", type:"icon", icon:"plus", width:35, click:function(){ this.getParentView().zoom("in");}},
			{view:"button", type:"icon", icon:"download", width:35, click:function(){ this.getParentView().download();}}
		];
		this.$ready.push(this._setScaleOptions);
	},
	_setScaleOptions:function(){
		var list = this.getChildViews()[6].getPopup().getBody();
		list.clearAll();
		list.parse([
			{ id:"auto", value:webix.i18n.PDFviewer.automaticZoom}, { id:"page-actual", value:webix.i18n.PDFviewer.actualSize},
			{ id:"page-fit", value:webix.i18n.PDFviewer.pageFit}, { id:"page-width", value:webix.i18n.PDFviewer.pageWidth},
			{ id:"page-height", value:webix.i18n.PDFviewer.pageHeight},
			{ id:"0.5", value:"50%"}, { id:"0.75", value:"75%"},
			{ id:"1", value:"100%"}, { id:"1.25", value:"125%"},
			{ id:"1.5", value:"150%"}, { id:"2", value:"200%"},
			{ id:"3", value:"300%"}, { id:"4", value:"400%"}
		]);
		var width = 0;
		list.data.each(function(obj){
			width = Math.max(webix.html.getTextSize(obj.value, "webixbutton").width, width);
		});
		this.getChildViews()[6].define("width", width+20);
		this.getChildViews()[6].resize();
	},
	_navigate:function(num){
		this.setMasterPage(num);
		this.setPage(this.$master.$pageNum);
	},
	setScale:function(scale){
		var sel = this.getChildViews()[6];
		sel.blockEvent();
		if(sel.getPopup().getList().exists(scale))
			sel.setValue(scale);
		else{
			sel.setValue("");
			sel.getInputNode().innerHTML = (scale*100).toFixed(0)+"%";
		}
		sel.unblockEvent();
	},
	setMasterScale:function(value){
		if(!this.$master) return;
		this.$master.setScale(value);
	},
	setMasterPage:function(num){
		if(!this.$master) return;
		if(num === "prev")
			this.$master.prevPage();
		else if(num==="next")
			this.$master.nextPage();
		else if(!isNaN(parseInt(num)))
			this.$master.renderPage(parseInt(num));
	},
	zoom:function(dir){
		if(!this.$master) return;
		if(dir === "out")
			this.$master.zoomOut();
		else if(dir === "in")
			this.$master.zoomIn();

	},
	setPage:function(num){
		this.getChildViews()[1].setValue(num);
	},
	setValues:function(num, scale){
		this.getChildViews()[2].data.limit = num;
		this.getChildViews()[2].refresh();

		this.setScale(scale);
	},
	download:function(){
		if(!this.$master) return;
		this.$master.download();
	}
}, webix.ui.toolbar);
