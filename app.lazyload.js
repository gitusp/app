/*!
 * extention for simple app framework featuring dependency tracking of views
 * by usp
 */

app.extend({
    lazyload: (function () {
        var originalRender = app.render,
            renderKey = 0,

            // init with data-prefix
            prefix = (function (hasPrefix) {
                    if (!hasPrefix.length) { return '' }
                    return hasPrefix.attr('data-prefix');
                })($('script[data-prefix]'));

        /**
         *  custom render and loader
         */
        app.render = function (states) {
            var key = ++renderKey,
                modules = [],
                i = 0;

            for (; i < states.length; i++) {
                modules.push(prefix + states[i].name);
            }

            // dumper for parallel stage
            require(
                modules,
                function () {
                    // cancel render because next view is required
                    if (key != renderKey) { return }
                    originalRender.call(app, states);
                });

            return app;
        };

        /**
        *  interface prefix setter and etc
        */
        return {
            prefix: function (p) {
                if (p === undefined) { return prefix }
                prefix = p;
            }
            // NOTE: etc?
        };
    })()
});
