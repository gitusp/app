/*!
 * simple app framework featuring dependency tracking of views
 * by usp
 */

// register special event
$.event.special.viewrender = $.event.special.viewactivate = $.event.special.viewdeactivate = {
    noBubble: true
};

// define app
var app = (function (app) {
    var views = {},
        activeViews = [],
        groups,
        hashKey;

    app.extend({
        /** 
         * register view and viewize
         */
        addView: function (view, name, withoutDefaultBindings) {
            // closures for view
            var requires = [],
                lastQuery,
                deactivateKey = null,
                activateKey = null,
                renderKey = null,
                deactivateCancel = false,
                bak = (bak = $('[data-bak]', view)).length ? bak : view;

            /*
             * expand view
             */
            view.extend({
                /** 
                 * define require other views
                 */
                require: function () {
                    if ( ! arguments.length) { return requires }
                    for (var i = 0; i < arguments.length; i++) {
                        requires.push(arguments[0]);
                    }
                    return view;
                },

                /**
                 * add subview
                 */
                toevoegen: function (view, withoutHiding) {
                    bak.append(view);
                    if ( ! withoutHiding) { view.hide() }
                },

                /** 
                 * view deactivator
                 */
                _deactivate: function () {
                    if (deactivateKey) { return }
                    deactivateKey = setTimeout(viewdeactivate, 0);
                    for (var i = 0; i < requires.length; i++) {
                        requires[i]._deactivate();
                    }
                },

                /** 
                 * view deactivator
                 */
                _activate: function (name) {
                    if (activateKey) { return }

                    var cancel, i = 0;
                    for (; i < requires.length; i++) {
                        requires[i]._activate(name);
                    }
                    if (deactivateKey) {
                        cancel = deactivateCancel = true;
                    }
                    activateKey = setTimeout(function () {
                        viewactivate(name, cancel);
                    }, 0);
                },

                /** 
                 * render view
                 * @param {Object} query feed
                 */
                _render: function (query) {
                    if (renderKey) { return }
                    renderKey = setTimeout(function () {
                        viewrender(query);
                    }, 0);
                }
            });

            // default handler of view
            view.bind('viewrender', function (e, query) {
                var originalQuery = queryStringify(query);
                if (originalQuery && originalQuery == lastQuery) {
                    e.stopImmediatePropagation();
                }
                lastQuery = originalQuery;
            });
            view.bind('viewdeactivate', function (e) {
                lastQuery = undefined;
            });

            // with default biding
            if ( ! withoutDefaultBindings) {
                // control visibility
                view.bind('viewactivate', function (e) {
                    view.show();
                });
                view.bind('viewdeactivate', function (e) {
                    view.hide();
                });
            }

            // is public view
            if (name) {
                // save view
                if (views[name]) {
                    throw 'view name ' + name + ' already exists.';
                } else {
                    views[name] = view;
                }
            }

            return app;

            /** 
             * deactivate the view
             */
            function viewdeactivate() {
                deactivateKey = null;
                if ( ! deactivateCancel) {
                    view.trigger('viewdeactivate');
                }
                deactivateCancel = false;
            }

            /** 
             * activate the view
             */
            function viewactivate(name, cancel) {
                activateKey = null;
                if ( ! cancel) {
                    view.trigger('viewactivate', name);
                }
            }

            /** 
             * render the view
             */
            function viewrender(query) {
                renderKey = null;
                view.trigger('viewrender', query);
            }
        },

        /** 
         * stage view and set hash
         * @param {String} name view name
         * @param {Object} query passed to view
         * @returns {jQuery} appself
         */
        stage: function (name, query) {
            var group = getGroup(name),
                viewPrototype = hash().split('|'),
                i = 0;

            // private view
            if ( ! group) { throw 'view name ' + name + ' is private.' }

            // remove exclusive
            for (; i < viewPrototype.length; i++) {
                if ( ! viewPrototype[i]) {
                    viewPrototype.splice(i, 1);
                    i--;
                    continue;
                }

                if (getGroup(viewPrototype[i].split('?')[0]) == group) {
                    viewPrototype.splice(i, 1);
                    i--;
                }
            }

            // add new hash
            query = queryStringify(query);
            viewPrototype.push(name + (query ? '?' + query : ''));
            hash('|' + viewPrototype.join('|'));

            return app;
        },

        /** 
         * unstage view and set hash
         * @param {String} group
         * @returns {jQuery} appself
         */
        unstage: function (group) {
            var viewPrototype = hash().split('|'),
                i = 0;

            // remove matched view
            for (; i < viewPrototype.length; i++) {
                if ( ! viewPrototype[i]) {
                    viewPrototype.splice(i, 1);
                    i--;
                    continue;
                }

                if (getGroup(viewPrototype[i].split('?')[0]) == group) {
                    viewPrototype.splice(i, 1);
                    i--;
                }
            }

            // apply new hash
            hash('|' + viewPrototype.join('|'));

            return app;
        },

        /** 
         * render views
         * @param {Array.<Object>} states collection of view and query
         * @returns {jQuery} appself
         */
        render: function(states) {
            var i, view;

            // viewdeactivate
            for (i = 0; i < activeViews.length; i++) {
                activeViews[i]._deactivate();
            }
            activeViews = [];

            // viewactivate and viewrender
            for (i = 0; i < states.length; i++) {
                if ( ! getGroup(states[i].name)) { throw 'view name ' + states[i].name + ' is private.' }
                view = views[states[i].name];
                view._activate(states[i].name);
                view._render(states[i].query);
                activeViews.push(view);
            }

            return app;
        },

        /** 
         * init app
         * @param {Object} g collection groups
         * @returns {jQuery} appself
         */
        init : function (g) {
            groups = g;
            app.hashchange();
            return app;
        }
    });

    // default event binding
    app.hashchange(function () {
        clearTimeout(hashKey);
        hashKey = setTimeout(function () {
            var statesBase = hash().split('|'),
                states = [],
                splited,
                querystring,
                query,
                i = 0;

            for (; i < statesBase.length; i++) {
                if ( ! statesBase[i]) {
                    statesBase.splice(i, 1);
                    i--;
                    continue;
                }

                splited = statesBase[i].split('?');
                querystring = splited[1] || '';

                if (querystring.indexOf('=') != -1) {
                    query = $.deparam.querystring('?' + querystring);
                } else {
                    query = decodeURIComponent(querystring);
                }

                states.push({
                    name: splited[0],
                    query: query
                });
            }

            app.trigger('viewchange', [states]);
        }, 0);
    });
    app.bind('viewchange', function (e, states) {
        app.render(states);
    });

    return app;

    /** 
     * treat hash
     * @param {String} hash if be feed then set hash, or return hash
     * @returns {String?} current hash
     */
    function hash(hash) {
        if (hash === undefined) {
            return $.browser.mozilla ? (window.location.href.split('#')[1] || '') : window.location.hash.replace(/^#/, '');
        } else {
            window.location.hash = hash;
        }
    }

    /** 
     * to query string
     * @param {Object} o
     * @returns {String} stringified
     */
    function queryStringify(o) {
        if ($.isPlainObject(o) || $.isArray(o)) {
            return $.param.querystring('', o).substr(1);
        }
        if (o) {
            return encodeURIComponent(o);
        }
        return '';
    }

    /** 
     * group getter
     * @param {String} name
     * @returns {String} group
     */
    function getGroup(name) {
        var group;
        $.each(groups, function (k, v) {
            if ($.inArray(name, v) != -1) {
                group = k;
            }
        });
        return group;
    }
})($(window));
