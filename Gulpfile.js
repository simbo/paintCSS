/**
 * + Gulpfile
 * https://github.com/gulpjs/gulp/blob/master/docs/API.md
 * https://github.com/gulpjs/gulp/tree/master/docs/recipes
 * =====================================================================
 */
'use strict';

// node modules
var _            = require('lodash'),
    autoPlug     = require('auto-plug'),
    autoprefixer = require('autoprefixer-core'),
    csswring     = require('csswring'),
    del          = require('del'),
    gulp         = require('gulp'),
    minimist     = require('minimist'),
    mqpacker     = require('css-mqpacker'),
    path         = require('path'),
    runSequence  = require('run-sequence'),
    uglify       = require('uglify-js'),
    util         = require('util');

// external data
var config = require(process.cwd() + '/Config.js'),
    pkg    = require(process.cwd() + '/package.json');

// auto-require gulp plugins
var g = autoPlug({ prefix: 'gulp', config: pkg });


/**
 * + Error handling
 * =====================================================================
 */

function handleError(err) {
    g.util.log(err.toString());
    this.emit('end');
}

/* = Error handling */


/**
 * + Parse CLI params
 * =====================================================================
 */

var params = (function(p){
        var cliParams = minimist(process.argv.slice(2));
        p.environment = cliParams.environment || cliParams.env || process.env.NODE_ENV || config.gulpParams.environment || 'production';
        return p;
    })({});

/* = Parse CLI params */


/**
 * + Stylus / CSS processing
 * =====================================================================
 */

gulp.task('build:css', ['clean:css'], function() {
    return gulp

        // grab all stylus files in stylus root folder
        .src(config.paths.assetsDev + '/stylus/*.styl')

        // pipe through stylus processor
        .pipe(g.stylus(config.stylus).on('error', handleError))

        // pipe through sourcemaps processor
        .pipe(g.sourcemaps.init({
            loadMaps: true
        }))

        // pipe through postcss processor
        .pipe(g.postcss((function(postcssPlugins){
                // minify only when in production mode
                if (params.environment === 'production') {
                    postcssPlugins.push(csswring(config.csswring));
                }
                return postcssPlugins;
            })([
                autoprefixer(config.autoprefixer),
                mqpacker
            ])
        ).on('error', handleError))

        // pipe through csslint if in development mode
        .pipe(g.if(
            params.environment === 'development',
            g.csslint(config.csslint)
        ))
        .pipe(g.csslint.reporter())

        // write sourcemaps
        .pipe(g.sourcemaps.write('.', {
            includeContent: true,
            sourceRoot: '.'
        }))

        // write processed styles
        .pipe(gulp.dest(path.join(config.paths.assets, 'css')))

        // trigger livereload
        .pipe(g.connect.reload());

});

/* = Stylus / CSS processing */


/**
 * + Javascript processing
 * =====================================================================
 */

gulp.task('build:js', ['clean:js'], function() {
    return gulp

        // grab main js files
        .src([
            path.join(config.paths.assetsDev, 'js/paint-css.js'),
            path.join(config.paths.assetsDev, 'js/main.js')
        ])

        // concatenate
        .pipe(g.concat('main.js'))

        // pipe through sourcemaps processor
        .pipe(g.sourcemaps.init())

        // uglify if in production mode
        .pipe(g.if(
            params.environment === 'production',
            g.uglify()
        ))

        // write sourcemaps containing inline sources
        .pipe(g.sourcemaps.write('.', {
            includeContent: true,
            sourceRoot: '.'
        }))

        // write processed javascripts
        .pipe(gulp.dest(path.join(config.paths.assets, 'js')))

        // trigger livereload
        .pipe(g.connect.reload());

});

/* = Javascript processing */


/**
 * + Jade task
 * =====================================================================
 */

gulp.task('build:html', ['clean:html'], function() {
    gulp.src(config.paths.site + '/**/*.jade')
        .pipe(g.jade(_.merge({
            pretty: params.environment=='development' ? true : false
        }, config.jade)).on('error', handleError))
        .pipe(gulp.dest(config.paths.web))
        .pipe(g.connect.reload());
});

/* = Jade task */


/**
 * + Copy tasks
 * =====================================================================
 */

// copy task definitions
var copyTasks = {
        jquery: {
            src: 'jquery.*',
            cwd: 'jquery/dist',
            baseCwd: config.paths.node
        }
    },
    copySequence = [];

// create copy tasks
Object.keys(copyTasks).forEach(function(name) {
    var task = copyTasks[name],
        taskName = 'copy:' + name;
    if (!task.hasOwnProperty('baseCwd')) {
        task.baseCwd = config.paths.bower;
    }
    gulp.task(taskName, function() {
        return gulp
            .src(task.src, {
                cwd: path.join(task.baseCwd, task.cwd),
                base: path.join(task.baseCwd, task.cwd)
            })
            .pipe(g.if(task.hasOwnProperty('extReplace'), g.extReplace('.styl')))
            .pipe(gulp.dest(path.join(config.paths[task.intoDev ? 'assetsDev' : 'assetsSrc'], 'vendor', name)));
    });
    copySequence.push(taskName);
});

// copy all dependencies
gulp.task('copy:deps', ['clean:deps'], function(done) {
    runSequence(copySequence, done);
});

/* = Copy tasks */


/**
 * + Config sync task
 * =====================================================================
 */

gulp.task('config-sync', function() {
    return gulp
        .src(path.join(config.paths.root, 'bower.json'))
        .pipe(g.configSync(config.configSync))
        .pipe(gulp.dest('.'));
});

/* = Config sync task */


/**
 * + Clean Tasks
 * =====================================================================
 */

// clean all dependencies
gulp.task('clean:deps', function(done) {
    del([
        path.join(config.paths.assetsSrc, 'vendor'),
        path.join(config.paths.assetsDev, 'vendor')
    ], done);
});

// clean generated html
gulp.task('clean:html', function(done) {
    del(config.paths.web + '/**/*.html', done);
});

// clean generated css
gulp.task('clean:css', function(done) {
    del(path.join(config.paths.assets, 'css'), done);
});

// clean generated js
gulp.task('clean:js', function(done) {
    del(path.join(config.paths.assets, 'js'), done);
});

/* = Clean Tasks */


/**
 * + Serve task
 * =====================================================================
 */

// webserver for development
gulp.task('serve', function() {
    g.connect.server({
        root: config.paths.web,
        host: 'localhost',
        port: 8888,
        livereload: true
    });
});

// trigger live-reload
gulp.task('reload', function() {
    gulp.src(config.paths.web)
        .pipe(g.connect.reload());
})

/* = Serve task */


/**
 * + Watch Task
 * =====================================================================
 */

gulp.task('watch', function() {

    // watch task defintions
    var watchTasks = {
        css: {
            glob: '**/*.styl',
            cwd: path.join(config.paths.assetsDev, 'stylus'),
            start: 'build:css'
        },
        js: {
            glob: '**/*.js',
            cwd: path.join(config.paths.assetsDev, 'js'),
            start: 'build:js'
        },
        html: {
            glob: [
                'site/**/*.jade'
            ],
            cwd: config.paths.src,
            start: 'build:html'
        },
        pkq: {
            glob: 'package.json',
            cwd: config.paths.root,
            start: 'config-sync'
        }
    }

    // show watch info in console
    function logWatchInfo(event) {
        var eventPath = path.relative(config.paths.root, event.path);
        g.util.log('File \'' + g.util.colors.cyan(eventPath) + '\' was ' + g.util.colors.yellow(event.type) + ', running tasks...');
    }

    // create watch tasks
    Object.keys(watchTasks).forEach(function(key) {
        var task = watchTasks[key];
        gulp.watch(task.glob, _.merge({ cwd: task.cwd }, config.watch), function(event) {
            logWatchInfo(event);
            gulp.start(task.start);
        });
    });

});

/* = Watch Task */


/**
 * + Common tasks
 * =====================================================================
 */

// default task
gulp.task('default', ['build']);

// full build
gulp.task('build', ['copy:deps', 'config-sync'], function(done) {
    runSequence(['build:html', 'build:css', 'build:js'], done);
});

// build and watch
gulp.task('dev', ['build'], function() {
    gulp.start('serve', 'watch');
});

/* = Common tasks */


/* = Gulpfile */
