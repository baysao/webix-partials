webix.protoUI({
	name: "richtext",
	defaults:{
		label:"",
		labelWidth:80,
		labelPosition:"left"
	},
	$init: function(config) {
		this.$ready.unshift(this._setLayout);
	},
	getInputNode:function(){
		return this.$view.querySelector(".webix_richtext_editor"); 
	},
	_button:function(name){
		return {
			view: "toggle",
			type: "iconButton",
			icon: name, name: name, id:name,
			label: webix.i18n.richtext[name],
			autowidth: true, 
			action:name,
			click: this._add_data
		};
	},
	_setLayout: function() {
		var top = this;

		var editField = {
			view: "template",
            css: "webix_richtext_container",
            borderless: true,
			template: "<div class='webix_richtext_editor' contenteditable='true'>"+this.getValue()+"</div>",
			on: {
				onAfterRender: function() {
					webix._event(
						top.getInputNode(),
						"input",
						function(){
							this.config.value = this.getInputNode().innerHTML;
						},
						{ bind: top }
					);
					webix._event( 
						top.getInputNode(),
						"keyup",
						function(){
						  top._getselection();
					});
				}
			},
			onClick: {
				webix_richtext_editor: function() {
					top._getselection();
				}
			}
		};

		var editorToolbar = {
			view: "toolbar",
			id:"toolbar",
			elements: [
				this._button("underline"),
				this._button("bold"),
				this._button("italic"),
				{}
			]
		};

		var rows = [
			editorToolbar,
			editField
		];

		if (this.config.labelPosition === "top" || !this.config.labelWidth){
			editorToolbar.elements.push({
				view:"label", label: this.config.label, align:"right"
			});
			this.rows_setter(rows);
		} else {
			this.config.borderless = true;
			this.cols_setter([{ 
				template: (this.config.label || " "),
				width: this.config.labelWidth
			}, {
				rows:rows
			}]);
		}
	},
	_getselection: function() {
		var top = this;
		var bar = top.$$("toolbar");
		var sel;

		bar.setValues({
			italic:false, underline:false, bold:false
		});

		if(window.getSelection) {
			sel = window.getSelection();
		} else {
			sel = document.selection.createRange();
		}

		for (var i = 0; i < sel.rangeCount; ++i) {
			var range = sel.getRangeAt(i);
			if (top.$view.contains(this.getInputNode())){
				if (document.queryCommandState("bold")) {
					top.$$("bold").setValue(true);
				} 
				if (document.queryCommandState("underline")) {
					top.$$("underline").setValue(true);
				}
				if (document.queryCommandState("italic")) {
					top.$$("italic").setValue(true);
				}
			}
		}
	},
	refresh: function() {
		this.getInputNode().innerHTML = this.config.value;
	},
	_execCommandOnElement:function(el, commandName) {
		var sel, selText;

		if(window.getSelection()) {
			sel = window.getSelection();
			selText = sel.toString().length;
		} else {
			sel = document.selection.createRange();
			selText = sel.text.length;
		}

		if(selText > 0) {
			for (var i = 0; i < sel.rangeCount; ++i) {
				var range = sel.getRangeAt(i);
				if (!sel.isCollapsed) {
					document.execCommand(commandName, false, '');
				} else {
					var textValue = sel.focusNode.textContent;
					var focusEl = sel.focusNode;
					var focustext = sel.anchorOffset;
					var wordBegining = textValue.substring(0, focustext).match(/[A-Za-z]*$/)[0];
					var wordEnd = textValue.substring(focustext).match(/^[A-Za-z]*/)[0];

					var startWord = focustext - wordBegining.length;
					var endWord = focustext + wordEnd.length;

					range.setStart(focusEl, startWord);
					range.setEnd(focusEl, endWord);
					sel.removeAllRanges();

					window.getSelection().addRange(range);
					document.execCommand(commandName, false, '');
				}   
			}
		}
	},
	_add_data:function() {
		var style = this.config.action;
		var top = this.getTopParentView();
		var editableElement = top.getInputNode();

		if(this.$view.contains(this.getInputNode())){
			top._execCommandOnElement(editableElement, this.config.action);
		}
	},
	focus: function() {
		var editableElement = this.$view.querySelector(".webix_richtext_editor");
		editableElement.focus();
	},
	setValue: function(value) {
		var old = this.config.value;
		this.config.value = value || "";

		if (old !== value)
			this.callEvent("onChange", [value, old]);

		this.refresh();
	},
	getValue: function() {
		var value = this.config.value;
		return value || (value ===0?"0":"");
	}
}, webix.IdSpace, webix.ui.layout);
