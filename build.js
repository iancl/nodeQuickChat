/**
 * THIS WILL BUILD THE PROJECT AND CREATE THE DIST FILE
 */

// imports
_fs = require("fs"),
_uglifyJS = require("uglify-js");
_jshint = require("jshint");
_uglifyCSS = require("uglifycss");


var publicPath = "public/",
	htmlFilePath = "./client.html",
	jsFiles = ['public/js/libs/jquery.js', 'public/js/libs/socket.io.js', 'public/js/libs/spin.js', 'public/js/libs/underscore.js', 'public/js/libs/backbone.js', 'public/js/main.js', 'public/js/dialog.js', 'public/js/router.js', 'public/js/socketManager.js', 'public/js/viewManager.js', 'public/js/views.js'],
	cssFiles = ["public/css/style.css"];

// cleanBuildFolder(path);
// createBuildFolders(path);
minifyScripts(publicPath, jsFiles);
minifyStyles(publicPath, cssFiles);
createProdFiles(htmlFilePath);




/******************************************************************************************
 * Functions
******************************************************************************************/

// will delete the current build folder
function cleanBuildFolder(path) {
  
	if( _fs.existsSync(path) ) {
		_fs.readdirSync(path).forEach(function(file,index){
      		var curPath = path + "/" + file;
      		if(_fs.lstatSync(curPath).isDirectory()) { // recurse
        		cleanBuildFolder(curPath);
      		} else { // delete file
        		_fs.unlinkSync(curPath);
      		}
    	});
    	_fs.rmdirSync(path);
  	}
}

// will create all the necesary build folders
function createBuildFolders(path){
	
	// create build folder
	try{
		_fs.mkdirSync(path);
	}catch(error){
		console.log("[ERROR]: building /build folder", error);
	}

	// create js folder
	try{
		_fs.mkdirSync(path+"js/");
	}catch(error){
		console.log("[ERROR]: building /build/js folder", error);
	}

	// create css folder
	try{
		_fs.mkdirSync(path+"css/");
	}catch(error){
		console.log("[ERROR]: building /build/js folder", error);
	}

}
	

// will minify, concat and save the js files
function minifyScripts(path, files){
	console.log("build => minifying scripts...");
	var uglified = _uglifyJS.minify(files);


	console.log("build => creating script.min.js file...");
	try{
		_fs.writeFileSync(path+"js/"+"script.min.js", uglified.code, 'utf8');
	} catch(error){
		console.log("[ERROR]: minifying js", error);
	}
	
}

// will minify, concat and save the css files
function minifyStyles(path, files){

	console.log("build => minifying styles...");

	var uglified = _uglifyCSS.processFiles(files);

	try{
		_fs.writeFileSync(path+"css/"+"style.min.css", uglified, 'utf8');
	} catch(error){
		console.log("[ERROR]: minifying css", error);
	}

}


function minHtml(html){

	console.log("build => minifying html...");
	// normalize
	html = html.replace(/\r/g, "\n");

	// strip comments
	html = html.replace(/<!--[\s\S]*?-->/g, "");

	// strip whitesapce at the end of a line
	html = html.replace(/[ \t]*\n/g, "\n");

	// strip whitespace at the end of the string
	html = html.replace(/\s$/, "");
	
	// strip blank lines (two or more line breaks in a row become one)
	html = html.replace(/\n\n+/g, "\n");


	return html;
}

function buildScripts(html){

	console.log("build => changing script paths to  script.min.js...");

	var scripts, jsFile, lastScript, replacementString;

	scripts = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gm);

	while (scripts && (link = scripts.shift())){

		jsfile = link.match(/src=["']([^'"]*)['"]/)[1];

		// skip any external js file
		if (jsfile.match(/^https:\/\//)) continue;

		

		// replace last script
		if(scripts.length == 1){
			lastScript =  scripts[0];
			replacementString = '<script src="public/js/script.min.js"></script>';
		} else {
			replacementString = "";
		}

		// replace/remove script here
		html = html.replace(link, replacementString);

	}


	return html;

}

function buildStyles(html){

	console.log("build => changing css paths to style.min.css...");

	var links = html.match(/(<link.*?href=["']([^'"]*)['"][^>]*>)/g),
		url,
		replacementString,
		lastLink;

	while (links && (link = links.shift())){

		url = link.match(/href=["']([^'"]*)['"]/)[1];

		if (url.match(/^https:\/\//)) continue;


		// replace last script
		if(links.length == 1){
			lastLink = links[0];
			replacementString = '<link rel="stylesheet" type="text/css" href="public/css/style.min.css">';
		} else {
			replacementString = "";
		}

		// replace/remove script here
		html = html.replace(link, replacementString);


	}

	return html;
}

// will get the client.html file, and change the css and js references to the compressed ones
function createProdFiles(path){
	
	var html;

	try{
		html = _fs.readFileSync(path, "utf8");
	} catch(error){
		console.log("[ERROR]: reading client.html", error);
	}

	html = buildScripts(html);
	html = buildStyles(html);
	html = minHtml(html);

	// create build html file
	console.log("build => Writing client_prod.html file...");
	try{
		_fs.writeFileSync("./client_prod.html", html, 'utf8');
	} catch(error){
		console.log("[ERROR]: creating html file", error);
	}

	console.log("build => build complete");
}





