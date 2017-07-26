define(["webix/core/webix"], function webix_window(webix){
/**

       Bazed on Promiz - A fast Promises/A+ library 
       https://github.com/Zolmeister/promiz

       The MIT License (MIT)

       Copyright (c) 2014 Zolmeister

       Permission is hereby granted, free of charge, to any person obtaining a copy of
       this software and associated documentation files (the "Software"), to deal in
       the Software without restriction, including without limitation the rights to
       use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
       the Software, and to permit persons to whom the Software is furnished to do so,
       subject to the following conditions:

       The above copyright notice and this permission notice shall be included in all
       copies or substantial portions of the Software.

       THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
       IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
       FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
       COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
       IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
       CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

    */

    /* jshint ignore:start */
    (function (self) {
        var now = typeof setImmediate !== 'undefined' ? setImmediate : function(cb) {
            setTimeout(cb, 0)
        }
        
        /**
         * @constructor
         */
        function promise(fn, er) {
            var self = this

            self.promise = self
            self.state = 'pending'
            self.val = null
            self.fn = fn || null
            self.er = er || null
            self.next = [];
        }

        promise.prototype.resolve = function (v) {
            var self = this
            if (self.state === 'pending') {
                self.val = v
                self.state = 'resolving'

                now(function () {
                    self.fire()
                })
            }
        }

        promise.prototype.reject = function (v) {
            var self = this
            if (self.state === 'pending') {
                self.val = v
                self.state = 'rejecting'

                now(function () {
                    self.fire()
                })
            }
        }

        promise.prototype.then = function (fn, er) {
            var self = this
            var p = new promise(fn, er)
            self.next.push(p)
            if (self.state === 'resolved') {
                p.resolve(self.val)
            }
            if (self.state === 'rejected') {
                p.reject(self.val)
            }
            return p
        }
        promise.prototype.fail = function (er) {
            return this.then(null, er)
        }
        promise.prototype.finish = function (type) {
            var self = this
            self.state = type

            if (self.state === 'resolved') {
                for (var i = 0; i < self.next.length; i++)
                    self.next[i].resolve(self.val);
            }

            if (self.state === 'rejected') {
                for (var i = 0; i < self.next.length; i++)
                    self.next[i].reject(self.val);

                if (webix.assert && !self.next.length)
                    throw(self.val);
            }
        }

        // ref : reference to 'then' function
        // cb, ec, cn : successCallback, failureCallback, notThennableCallback
        promise.prototype.thennable = function (ref, cb, ec, cn, val) {
            var self = this
            val = val || self.val
            if (typeof val === 'object' && typeof ref === 'function') {
                try {
                    // cnt protects against abuse calls from spec checker
                    var cnt = 0
                    ref.call(val, function(v) {
                        if (cnt++ !== 0) return
                        cb(v)
                    }, function (v) {
                        if (cnt++ !== 0) return
                        ec(v)
                    })
                } catch (e) {
                    ec(e)
                }
            } else {
                cn(val)
            }
        }

        promise.prototype.fire = function () {
            var self = this
            // check if it's a thenable
            var ref;
            try {
                ref = self.val && self.val.then
            } catch (e) {
                self.val = e
                self.state = 'rejecting'
                return self.fire()
            }

            self.thennable(ref, function (v) {
                self.val = v
                self.state = 'resolving'
                self.fire()
            }, function (v) {
                self.val = v
                self.state = 'rejecting'
                self.fire()
            }, function (v) {
                self.val = v
                
                if (self.state === 'resolving' && typeof self.fn === 'function') {
                    try {
                        self.val = self.fn.call(undefined, self.val)
                    } catch (e) {
                        self.val = e
                        return self.finish('rejected')
                    }
                }

                if (self.state === 'rejecting' && typeof self.er === 'function') {
                    try {
                        self.val = self.er.call(undefined, self.val)
                        self.state = 'resolving'
                    } catch (e) {
                        self.val = e
                        return self.finish('rejected')
                    }
                }

                if (self.val === self) {
                    self.val = TypeError()
                    return self.finish('rejected')
                }

                self.thennable(ref, function (v) {
                    self.val = v
                    self.finish('resolved')
                }, function (v) {
                    self.val = v
                    self.finish('rejected')
                }, function (v) {
                    self.val = v
                    self.state === 'resolving' ? self.finish('resolved') : self.finish('rejected')
                })

            })
        }

        promise.prototype.done = function () {
            if (this.state = 'rejected' && !this.next) {
                throw this.val
            }
            return null
        }

        promise.prototype.nodeify = function (cb) {
            if (typeof cb === 'function') return this.then(function (val) {
                try {
                    cb(null, val)
                } catch (e) {
                    setImmediate(function () {
                        throw e
                    })
                }

                return val
            }, function (val) {
                try {
                    cb(val)
                } catch (e) {
                    setImmediate(function () {
                        throw e
                    })
                }

                return val
            })

            return this
        }

        promise.prototype.spread = function (fn, er) {
            return this.all().then(function (list) {
                return typeof fn === 'function' && fn.apply(null, list)
            }, er)
        }
        
        promise.prototype.all = function() {
            var self = this
            return this.then(function(list){
                var p = new promise()
                if(!(list instanceof Array)) {
                    p.reject(TypeError)
                    return p
                }
                
                var cnt = 0
                var target = list.length
                
                function done() {
                    if (++cnt === target) p.resolve(list)
                }
                
                for(var i=0, l=list.length; i<l; i++) {
                    var value = list[i]
                    var ref;
                    
                    try {
                        ref = value && value.then
                    } catch (e) {
                        p.reject(e)
                        break
                    }
                    
                    (function(i){
                        self.thennable(ref, function(val){
                            list[i] = val
                            done()
                        }, function(val){
                            p.reject(val);
                        }, function(){
                            done()
                        }, value)
                    })(i)
                }

                return p
            })
        }

        // self object gets globalalized/exported
        var promiz = {

            all:function(list){
                var p = new promise(null, null);
                p.resolve(list);
                return p.all();
            },
            // promise factory
            defer: function () {
                return new promise(null, null)
            },

            reject:function(v){
                var t = this.defer();
                t.state = "rejected";
                t.val = v;
                return t;
            },

            resolve:function(v){
                var t = this.defer();
                t.state = "resolved";
                t.val = v;
                return t;
            },

            // calls a function and resolved as a promise
            fcall: function() {
                var def = new promise()
                var args = Array.apply([], arguments)
                var fn = args.shift()
                try {
                    var val = fn.apply(null, args)
                    def.resolve(val)
                } catch(e) {
                    def.reject(e)
                }

                return def
            },

            // calls a node-style function (eg. expects callback as function(err, callback))
            nfcall: function() {
                var def = new promise()
                var args = Array.apply([], arguments)
                var fn = args.shift()
                try {

                    // Add our custom promise callback to the end of the arguments
                    args.push(function(err, val){
                        if(err) {
                            return def.reject(err)
                        }
                        return def.resolve(val)
                    })
                    fn.apply(null, args)
                } catch (e) {
                    def.reject(e)
                }

                return def
            }
        }
        
        self.promise = promiz
    })(webix);
/* jshint ignore:end */
return webix;
});
