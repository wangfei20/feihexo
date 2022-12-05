const { pipeline, Router } = require("./utils/pipeline.js")
const fs = require("fs")
const path = require("path")
const yaml = require("js-yaml")
const express= require("express")
const ejs = require("ejs")
const markdown = require("markdown").markdown;
const yamlFront = require("yaml-front-matter")
const Promise = require('bluebird');


var port = 4000;

function readAllFiles(directory, callback) {
    fs.readdir(path.join(__dirname, directory), { withFileTypes: true }, function(err, subs) {
        if (err)
            callback();
        var files = [];
        var index = 0;

        var read = function(f) {
            if (f.isFile()) {
                fs.readFile(path.join(__dirname, directory, f.name), { encoding: "utf-8" }, function(err, file) {
                    files.push({
                        filename: path.join(directory, f.name),
                        content: file
                    });
                    if (++index == subs.length)
                        return callback(files)
                })
            } else {
                readAllFiles(path.join(directory, f.name), function(subFiles) {
                    if (subFiles) {
                        for (var f of subFiles)
                            files.push(f);
                    }
                    if (++index == subs.length)
                        return callback(files)
                })
            }
        }

        for (var f of subs) {
            read(f)
        }

    })
}

function loadExtension(ctx, next) {
    ctx.extend = {};
    ctx.extend.tag = {};
    var exts = path.join(__dirname, "extends")
    fs.readdir(exts, { withFileTypes: true },
        function(err, files) {
          if(!err){
            for (var f of files) {
                require(path.join(exts, f.name))(ctx);
            }
          }
          next();
        });
}

function readSource(ctx, next) {

    ctx.locals = {posts:[],pages:[],tags:[]}

    readAllFiles(ctx.config.source_dir, function(result) {
        Promise.each(result, function(file) {
            return parseSourceFile(ctx, file)
        }).then(result => {
        	ctx.htmlFiles = result;
            //console.log(result)
          render(ctx,next)
        });
    });
}

function parseSourceFile(ctx, raw) {

    var file = yamlFront.loadFront(raw.content);
    //console.log("file",raw);
    file.filename = raw.filename;

    var roo;
    if(file.filename.indexOf((roo = path.join(ctx.config.source_dir,"page"))) == 0){

    } else if(file.filename.indexOf((roo = path.join(ctx.config.source_dir,"post"))) == 0)
    {} else {
    	roo = ctx.config.source_dir;
    }

	file.path = file.filename.split(roo)[1].substring(1)
	file.path = file.path.substr(0,file.path.length - 3)

    var reg = /<[^<]+>/g
    //if (file.__content.match(reg)) {
    	var ext = ejs.render(file.__content, ctx.extend.tag);

        file.content = markdown.toHTML(ext)
    //}

    if (file.layout == "post") {
        ctx.locals.posts.push(file)

        // tags feature
        for(var t of file.tags){
          if(!ctx.locals.tags[t])
            ctx.locals.tags[t] = {name:t, path:"tags/"+t, posts:[]}
          ctx.locals.tags[t].posts.push(file)
        }
    } else {
        ctx.locals.pages.push(file)
        //if(file.path == "index")
        //	file.layout = "index";
    }

}

function render(ctx,next) {

  var pages = [...ctx.locals.pages,...ctx.locals.posts]
	console.log("hexo generating files " + pages.length)

  Promise.each(pages,function(file){

    var template = path.join(__dirname, "themes", ctx.config.theme, "layout");
    var renderFile = Promise.promisify(ejs.renderFile);

    var access = Promise.promisify(fs.access);
  //site: {posts:ctx.locals.posts, tags: ctx.locals.tags},
    var data = {
        config: ctx.config,
        page: file,
        site: {posts:ctx.locals.posts, tags: ctx.locals.tags},
        body: "",
        ...ctx.extend.tag
    };

    var layout = path.join(template, (file.layout || "layout") + ".ejs");

    return access(layout, fs.constants.R_OK).then(function(succ) {

        return renderFile(layout, data, { filename: layout }).then(function(first) {

            if (path.basename(layout, ".ejs") != "layout") {
                data.body = first
                layout = path.join(template, "layout.ejs")
                return renderFile(layout, data, { filename: layout }).then(function(final) {

                    file.page = final
                })
            } else file.page = first
        })
    }, function(err) {
        console.log("There's no matching template for "+ file.filename + "'s layout ", file.layout)
        layout = path.join(template, "layout.ejs")
        return renderFile(layout, data, { filename: layout }).then(function(page) {
            //console.log("3 " + layout + page)
            file.page = page
        })
    })

  }).then(()=>{
    next()
  })
}

function readConfig(ctx, next) {

    fs.readFile(path.join(__dirname, "_config.yml"), { encoding: "utf-8" }, function(err, file) {
        if(err){
          console.error("Can't find _config.yml. Go create one!");
          return;
        }
        ctx.config = yaml.load(file);
        next()

    });
}

function generateHTMLs(ctx, next) {
	//console.log(ctx.locals)
	var pages = [...ctx.locals.pages,...ctx.locals.posts]
	console.log("hexo generating files " + pages.length)

    Promise.each(pages,function(page){
    	//var p = path.join(__dirname,ctx.config.source_dir,page.data.path)
    	var writeFile = Promise.promisify(fs.writeFile)

    	var directory = path.join(__dirname,ctx.config.public_dir);
    	var filePath = path.join(directory,page.path)
    	if(page.path == "index"){
    		filePath += ".html"
    		console.log(filePath)
    	}
    	else {
        console.log(page.path);
        //var f = page.data.path.substring(ctx.config.public_dir.length)
    		for(var d of page.path.split("\\")){
    			directory = path.join(directory,d);
          if(!fs.existsSync(directory))
            fs.mkdirSync(directory)
    		}
    		filePath = path.join(filePath,"index.html")
    	};

    	console.log("writing", filePath)
      try {
        fs.writeFileSync(filePath,
      		page.page)
      } catch (e) {
        console.log("catch error",e);
      } finally {

      }
    	return
    }).then(function(result){
    	next()
    })
}

function copyAssets(ctx,next){
  var public_assets = path.join(__dirname,"public","assets")
  var source_assets = path.join( "themes", ctx.config.theme, "source","assets");

  readAllFiles(source_assets,function(result){
    Promise.each(result,function(file){
      var dir = file.filename.substring(source_assets.length);
      console.log("dir",dir);
      for(var d of path.dirname(dir).split("\\")){
        var new_path = path.join(public_assets,d);
        if(!fs.existsSync(new_path))
          fs.mkdirSync(new_path)
      }

      fs.copyFileSync(path.join(__dirname,file.filename),path.join(public_assets,dir))
    }).then(function(){
      next()
    })
  })
}

function serveStatic(ctx, next) {
	var app = express();
	app.use(express.static(__dirname + '/public'))
	require("http").createServer(app).listen(80);
    next()
}

function clean(ctx, next) {

  function delFile(path, reservePath) {
      if (fs.existsSync(path)) {
          if (fs.statSync(path).isDirectory()) {
              let files = fs.readdirSync(path);
              files.forEach((file, index) => {
                  let currentPath = path + "/" + file;
                  if (fs.statSync(currentPath).isDirectory()) {
                      delFile(currentPath, reservePath);
                  } else {
                      fs.unlinkSync(currentPath);
                  }
              });
              if (path != reservePath) {
                  fs.rmdirSync(path);
              }
          } else {
              fs.unlinkSync(path);
          }
      }
  }

  delFile(path.join(__dirname,ctx.config.public_dir))
  fs.mkdirSync(path.join(__dirname,ctx.config.public_dir))
  next()
}

function hexo() {

    var pipelines = {}

    function createPipelines(names) {
        var pre;
        for (var i = names.length - 1; i >= 0; i--) {
            pre = pipelines[names[i]] = pipeline(pre, { id: names[i] })
        }
    }

    createPipelines([
        "config",
    	  "clean",
        "extension",
        "source",
        "generate",
        "assets",
        "serve"
    ])

    pipelines["config"].use(readConfig)
    pipelines["clean"].use(clean)
    pipelines["extension"].use(loadExtension)
    pipelines["source"].use(readSource)
    pipelines["generate"].use(generateHTMLs)
    pipelines["assets"].use(copyAssets)
    pipelines["serve"].use(serveStatic)




    this.use = function(pattern, middleware) {
        pipelines[pattern].use(middleware);
    }

    this.start = function() {
        pipelines["config"]({})
    }

}

var args = process.argv

args.shift()
args.shift()

switch (args.shift()) {
    case "start":
        var myHexo = new hexo();
        var p = args.shift()
        if(p)
          port = p;
        myHexo.start()

        break;

    case "new":

        var type = args.shift();
        var name = args.shift()

        var command = require("./utils/command.js")(args)
        var yml = { layout: type, title: name }
        yml = { ...yml, ...command }

        var str = "---\r\n"
        str += yaml.dump(yml);
        str += "---"

        var p = path.join(__dirname, "source", type)

        if (fs.existsSync(p))
            fs.mkdirSync(p)

        fs.writeFileSync(path.join(p, name + ".md"), str);
        //})



        //console.log(yml,str)

        break;
}
