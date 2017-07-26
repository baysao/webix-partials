define(["webix/core/webix"], function webix_export(webix){
(function(){

        webix.toPNG = function(id, options){
            var defer = webix.promise.defer();

            webix.require(webix.cdn + "/extras/html2canvas.min.js", function(){
                //backward compatibility
                if (typeof options === "string") options = { filename: options };
                options = options || {};
                
                var view = webix.$$(id);
                if (view && view.$exportView)
                    view = view.$exportView(options);

                var node = view ? view.$view : webix.toNode(id);
                var filename = (options.filename||"Data")+".png";
                
                window.html2canvas(node).then(function(canvas) {
                    var data = canvas.msToBlob?canvas.msToBlob():canvas.toDataURL("image/png");
                    if(options.download !== false)
                        webix.html.download(data, filename);
                    canvas.remove();
                    defer.resolve(data);
                });
            });
            return defer;
        };


        webix.toExcel = function(id, options){
            var defer = webix.promise.defer();

            webix.require(webix.cdn + "/extras/xlsx.core.min.js", function(){
                options = options || {};

                var view = webix.$$(id);
                if (view.$exportView)
                    view = view.$exportView(options);
                
                options._export_mode = "excel";
                
                var scheme = getExportScheme(view, options);
                var result = getExportData(view, options, scheme);

                var spans  = options.spans ? getSpans(view, options) : [];
                var data   = getExcelData(result, scheme, spans);

                var wb = { SheetNames:[], Sheets:[]};
                var name = options.name || "Data";
                name = name.replace(/[\*\?\:\[\]\\\/]/g,"").substring(0, 31);
                wb.SheetNames.push(name);
                wb.Sheets[name] = data;
                
                var xls = XLSX.write(wb, {bookType:'xlsx', bookSST:false, type: 'binary'});
                var filename =  (options.filename || name)+".xlsx";
                
                var blob = new Blob([str2array(xls)], { type: "application/xlsx" });
                if(options.download !== false)
                    webix.html.download(blob, filename);
                defer.resolve(blob);
            });
            return defer;
        };

        webix.toCSV = function(id, options){
            options = options || {};
            
            var view = webix.$$(id);
            if (view.$exportView)
                view = view.$exportView(options);
            
            options._export_mode = "csv";
            
            var scheme = getExportScheme(view, options);
            var result = getExportData(view, options, scheme);

            var data = getCsvData(result, scheme);
            var filename =  (options.filename || "Data")+".csv";
            
            var blob = new Blob(["\uFEFF" + data], { type: "text/csv" });
            if(options.download !== false)
                webix.html.download(blob, filename);

            return webix.promise.resolve(blob);
        };

        function getCsvData(data, scheme) {
            return webix.csv.stringify(data);
        }

        var font;
        webix.toPDF = function(id, options){
            var defer = webix.promise.defer();

            webix.require(webix.cdn + "/extras/pdfjs.js", function(){
                options = options || {};

                var view = webix.$$(id);
                if (view.$exportView)
                    view = view.$exportView(options);

                options._export_mode = "pdf";
                options._export_font = font;
                options.fontName = options.fontName ||"pt-sans.regular";

                var scheme = getExportScheme(view, options);
                var data = getExportData(view, options, scheme);

                var callback = function(pdf, options){
                    var filename = (options.filename || "Data")+".pdf";
                    var blob = new Blob([pdf.toString()], { type: "application/pdf" });

                    if(options.download !== false)
                        webix.html.download(blob, filename);
                    defer.resolve(blob);
                };

                if(options._export_font)
                    getPdfData(scheme, data, options, callback);
                else
                    pdfjs.load(webix.cdn + "/extras/"+options.fontName+".ttf", function(err, buf){
                        if(err) throw err;
                        font = options._export_font = new pdfjs.TTFFont(buf);
                        getPdfData(scheme, data, options, callback);
                    });
            });
            return defer;
        };

        function getExportScheme(view, options){
            var scheme = [];
            var h_count = 0, f_count = 0;
            var isTable = view.getColumnConfig;
            var columns = options.columns;
            var raw = !!options.rawValues;

            if (!columns){
                if (isTable){
                    columns = [].concat(view._columns);
                }
                else {
                    columns = [];
	       	        var obj = view.data.pull[view.data.order[0]];
			        for (var key in obj)
				        if(key !== "id")
					        columns.push({id:key});
                }
            }
            else if(!columns.length){
		        //export options are set as - columns:{ rank:true, title:{ header:"custom"}}
		        var arr = [];
		        for(var key in columns)
			        arr.push(webix.extend({ id:key}, webix.extend({}, columns[key])));
		        columns = arr;
	        }

            if (options.ignore)
                for (var i=columns.length-1; i>=0; i--)
                    if (options.ignore[columns[i].id])
                        columns.splice(i,1);

            if (options.id)
                scheme.push({ id:"id", width:50, header:" ", template:function(obj){ return obj.id; }});

            if (options.flatTree){
                var flatKey = options.flatTree.id;
                var copy = [].concat(options.flatTree.columns);
                var fill = [];
                var fillMode = !!options.flatTree.fill;
                for (var i = 1; i <= copy.length; i++)
                    copy[i-1].template = (function(i, c){ 
                        return function(obj){ 
                            return obj.$level == i ? (fill[i]=obj[flatKey]) : ((fillMode && i<obj.$level)?fill[i]:""); 
                        };
                    })(i);

                var index = 0;
                for (var i = columns.length-1; i >= 0; i--)
                    if (columns[i].id === flatKey)
                        index = i;

                columns = [].concat(columns.slice(0,index)).concat(copy).concat(columns.slice(index+1));
            }

            
            for (var j = 0; j < columns.length; j++) {
                var column = columns[j];
                var key = column.id;

                if (column.noExport) continue;
                
		        if (isTable && view._columns_pull[key])
			        column = webix.extend(webix.extend({}, column), view._columns_pull[key]);

		        var record = {
			        id:         column.id,
			        template:   ( (raw ? null : column.template) || function(key, column){return function(obj){ return column.format ? column.format(obj[key]) : obj[key]; };}(key, column)),
			        width:      ((column.width   || 200) * (options._export_mode==="excel"?8.43/70:1 )),
			        header:     (column.header!==false?(column.header||key)  : "")
		        };

		        if(typeof record.header === "string") record.header = [{text:record.header}];
		        else record.header = webix.copy(record.header);

		        for(var i = 0; i<record.header.length; i++){
			        record.header[i] = record.header[i]?(record.header[i].contentId?"":record.header[i].text):"";
		        }
		        h_count = Math.max(h_count, record.header.length);

		        if(view._settings.footer){
			        var footer = column.footer || "";
			        if(typeof footer == "string") footer = [{text:footer}];
			        else footer = webix.copy(footer);

			        for(var i = 0; i<footer.length; i++){
				        if(footer[i]) footer[i] = footer[i].contentId?view.getHeaderContent(footer[i].contentId).getValue():footer[i].text;
				        else footer[i] = "";
			        }
			        record.footer = footer;
			        f_count = Math.max(f_count, record.footer.length);
		        }
		        scheme.push(record);
	        }

            for(var i =0; i<scheme.length; i++){

                var diff = h_count-scheme[i].header.length;
                for(var d=0; d<diff; d++)
                    scheme[i].header.push("");

                if(view._settings.footer){
                    diff = f_count-scheme[i].footer.length;
                    for(var d=0; d<diff; d++)
                        scheme[i].footer.push("");
                }
            }

            return scheme;
        }


        function getExportData(view, options, scheme){
            var filterHTML = !!options.filterHTML;
            var htmlFilter = /<[^>]*>/gi;
            var data = [];
            var header, headers;

            if( options.header !== false && scheme.length){
                for(var h=0; h < scheme[0].header.length; h++){
                    headers = [];
                    for (var i = 0; i < scheme.length; i++){
                        header = "";
                        if(scheme[i].header[h]){
                            header = scheme[i].header[h];
                            if (filterHTML)
                                header = scheme[i].header[h] = header.replace(htmlFilter, "");
                        }
                        
                        headers.push(header);
                    }
                    if (options._export_mode === "excel") data.push(headers);
                    if (options._export_mode === "csv") {
            	        headers.map(function(item) {
            		        item.replace(/<[^>]*>/gi,"");
            	        });
            	        data.push(headers);
                    }
                }
            }

            var isTree = (view.data.name == "TreeStore");
            var treeline = (options.flatTree || options.plainOutput) ? "" : " - ";

            view.data.each(function(item){
                if(item){ //dyn loading
                    var line = [];
                    for (var i = 0; i < scheme.length; i++){
                        var column = scheme[i];
                        var cell = column.template(item, view.type, item[column.id], column, i);
                        if (!cell && cell !== 0) cell = "";
                        if (filterHTML && typeof cell === "string"){
                            if(isTree)
                                cell = cell.replace(/<div class=.webix_tree_none.><\/div>/, treeline);
                            cell = cell.replace(htmlFilter, "");
                        }
                        //remove end/start spaces(ex.hierarchy data)
                        if (typeof cell === "string" && options._export_mode === "csv")
                            cell = cell.trim();
                        //for multiline data
                        if (typeof cell === "string" && (options._export_mode === "excel" || options._export_mode === "csv")){
                	        cell = cell.replace(/<br\s*\/?>/mg,"\n");
                        }
                        line.push(cell);
                    }
                    data.push(line);
                }
            }, view);


            if( options.footer !==false ){
                var f_count = scheme[0].footer?scheme[0].footer.length:0;
                for (var f = 0; f < f_count; f++){
                    var footers  = [];
                    for(var i = 0; i<scheme.length; i++){
                        var footer = scheme[i].footer[f];
                        if (filterHTML) footer = scheme[i].footer[f] = footer.toString().replace(htmlFilter, "");
                        footers.push(footer);
                    }
                    if(options._export_mode === "excel") data.push(footers);
                }
            }

            return data;
        }

        function getColumnsWidths(scheme){
            var wscols = [];
            for (var i = 0; i < scheme.length; i++)
                wscols.push({ wch: scheme[i].width });
            
            return wscols;
        }

        function excelDate(date) {
            return Math.round(25569 + date / (24 * 60 * 60 * 1000));
        }

        function getSpans(view, options){
            var pull = view._spans_pull;
            var spans = [];

            if(pull){
                //correction for spreadsheet
                var xc = options.xCorrection || 0;
                var yc = options.yCorrection || 0;
                for(var row in pull){
                    //{ s:{c:1, r:0}, e:{c:3, r:0} }
                    var cols = pull[row];
                    for(var col in cols){
                        var sc = view.getColumnIndex(col) - xc;
                        var sr = view.getIndexById(row) - yc;
                        var ec = sc+cols[col][0]-1;
                        var er = sr+(cols[col][1]-1);

                        //+1 to exclude excel header
                        spans.push({ s:{c:sc, r:sr+1}, e:{c:ec, r:er+1} });
                    }
                }
            }
            return spans;
        }

        var table = "_table";
        function getExcelData(data, scheme, spans) {
            var ws = {};
            var range = {s: {c:10000000, r:10000000}, e: {c:0, r:0 }};
            for(var R = 0; R != data.length; ++R) {
                for(var C = 0; C != data[R].length; ++C) {
                    if(range.s.r > R) range.s.r = R;
                    if(range.s.c > C) range.s.c = C;
                    if(range.e.r < R) range.e.r = R;
                    if(range.e.c < C) range.e.c = C;

                    var cell = {v: data[R][C] };
                    if(cell.v === null) continue;
                    var cell_ref = XLSX.utils.encode_cell({c:C,r:R});

                    if(typeof cell.v === 'number') cell.t = 'n';
                    else if(typeof cell.v === 'boolean') cell.t = 'b';
                    else if(cell.v instanceof Date) {
                        cell.t = 'n'; cell.z = XLSX.SSF[table][14];
                        cell.v = excelDate(cell.v);
                    }
                    else cell.t = 's';

                    ws[cell_ref] = cell;
                }
            }
            if(range.s.c < 10000000) ws['!ref'] = XLSX.utils.encode_range(range);

            ws['!cols'] = getColumnsWidths(scheme);
            if(spans.length)
                ws["!merges"] = spans;
            return ws;
        }

        function str2array(s) {
            var buf = new ArrayBuffer(s.length);
            var view = new Uint8Array(buf);
            for (var i=0; i!=s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
            return buf;
        }

        function getPdfData(scheme, data, options, callback){


            options.header = (webix.isUndefined(options.header) || options.header === true) ? {} : options.header;
            options.footer = (webix.isUndefined(options.footer) || options.footer === true) ? {} : options.footer;
            options.table = options.table || {};

            var width = options.width||595.296, height = options.height || 841.896;// default A4 size

            if(options.orientation && options.orientation ==="landscape")
                height = [width, width = height][0];

            if(options.autowidth){
                width = 80; //paddings
                for(var i = 0; i<scheme.length; i++)
                    width += scheme[i].width;
            }
            
            var doc = new pdfjs.Document({
                padding: 40,
                font: options._export_font,
                threshold:256,
                width:width,
                height:height
            });


            //render table
            var h_count = options.header === false ? 0: scheme[0].header.length;
            var f_count = (options.footer === false || !scheme[0].footer) ? 0: scheme[0].footer.length;
            
            var colWidths = [];
            for(var i = 0; i<scheme.length; i++)
                colWidths[i] = scheme[i].width;

            var tableOps = webix.extend(options.table, {
                borderWidth: 1,height:20, lineHeight:1.1,
                borderColor: 0xEEEEEE, backgroundColor: 0xFFFFFF, color:0x666666,
                textAlign:"left", paddingRight:10, paddingLeft:10,
                headerRows:h_count, widths: colWidths.length?colWidths:["100%"]
            });

            var table = doc.table(tableOps);

            //render table header
            if(h_count){
                var headerOps = webix.extend(options.header, {
                    borderRightColor:0xB0CEE3, borderBottomColor:0xB0CEE3,
                    color:0x4A4A4A, backgroundColor:0xD2E3EF,
                    height:27, lineHeight:1.2
                });

                for(var i = 0; i<h_count; i++){
                    var header = table.tr(headerOps);
                    for(var s=0; s<scheme.length; s++)
                        header.td(scheme[s].header[i].toString());
                }
            }
            
            //render table data
            for(var r=0; r<data.length;r++){
                var row = table.tr({});
                for(var c=0; c< data[r].length; c++)
                    row.td(data[r][c]);
            }

            //render table footer
            if(f_count){
                var footerOps = webix.extend(options.footer, {
                    borderRightColor:0xEEEEEE, borderBottomColor:0xEEEEEE,
                    backgroundColor: 0xFAFAFA, color:0x666666,
                    height:27, lineHeight:1.2
                });

                for(var i = 0; i<f_count; i++){
                    var footer = table.tr(footerOps);
                    for(var s=0; s<scheme.length; s++)
                        footer.td(scheme[s].footer[i].toString());
                }
            }

            //doc footer
            if(options.docFooter !== false){
                var ft = doc.footer();
                ft.text({
                    color: 0x666666, textAlign:"center"
                }).append((webix.i18n.dataExport.page||"Page")).pageNumber().append("  "+(webix.i18n.dataExport.of || "of")+"  ").pageCount();
            }
            

            //doc header, configurable
            if(options.docHeader){
                if(typeof options.docHeader == "string") options.docHeader = {text:options.docHeader};
                var docHeaderOps = webix.extend(options.docHeader, {
                    color: 0x666666, textAlign:"right"
                });

                var hd = doc.header({paddingBottom:10});
                hd.text(docHeaderOps.text, docHeaderOps);
            }

            if (options.docHeaderImage){
                if(typeof options.docHeaderImage == "string") options.docHeaderImage = {url:options.docHeaderImage};
                var hd = doc.header({paddingBottom:10});
                var docImageOps = webix.extend(options.docHeaderImage, {
                    align:"right"
                });

                pdfjs.load(options.docHeaderImage.url, function(err, buffer){
                    if (!err){
                        var img = new pdfjs.Image(buffer);
                        var image = hd.image(img, docImageOps);
                    }
                    //render pdf and show in browser
                    var pdf = doc.render();
                    callback(pdf, options);
                });
            }
            else{
                //render pdf and show in browser
                var pdf = doc.render();
                callback(pdf, options);
            }
        }

    })();
return webix;
});
