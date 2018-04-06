var express = require('express');
var app =express();
var http =require('http').Server(app);
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var mongoStore = require('connect-mongo')(session);
var methodOverride = require('method-override');
var path = require('path');
var fs = require('fs');
var logger = require('morgan');
app.use(logger('dev'));

//socket.io
require('./library/Chat.js').sockets(http);

//db connection
mongoose.Promise = global.Promise;
var dbPath = "mongodb://localhost/chatDatabase";
mongoose.connect(dbPath,{ useMongoClient: true });
mongoose.connection.once('open',function(){
  console.log("Database Connected Successfully.");
});
var userModel = mongoose.model('user');

//http method override middleware
app.use(methodOverride(function(req,res){
  if(req.body && typeof req.body === 'object' && '_method' in req.body){
    var method = req.body._method;
    delete req.body._method;
    return method;
  }
}));

// Session setup for cookies
var sessionInit = session({
                    name : 'userCookie',
                    secret : '9743-980-270-india',
                    resave : true,
                    httpOnly : true,
                    saveUninitialized: true,
                    store : new mongoStore({mongooseConnection : mongoose.connection}),
                    cookie : { maxAge : 80*80*800 }
                  });

app.use(sessionInit);
app.use(express.static(path.resolve(__dirname,'./public')));

// Setting ejs view engine
app.set('view engine', 'ejs');
app.set('views', path.resolve(__dirname,'./app/views'));

app.use(bodyParser.json({limit:'10mb',extended:true}));
app.use(bodyParser.urlencoded({limit:'10mb',extended:true}));
app.use(cookieParser());

//including models files.
fs.readdirSync("./app/models").forEach(function(file){
  if(file.indexOf(".js")){
    require("./app/models/" + file);
  }
});

//including controllers files.
fs.readdirSync("./app/controllers").forEach(function(file){
  if(file.indexOf(".js")){
    var route = require("./app/controllers/" + file);
    route.controller(app);
  }
});

// Error Handler
app.use(function(req,res){
  res.status(404).render('message',
      {
          title: "404",
          msg: "Page Not Found.",
          status: 404,
          error: "",
          user: req.session.user,
          chat: req.session.chat
      });
});

app.use(function(req,res,next){

	if(req.session && req.session.user){
		userModel.findOne({'email':req.session.user.email},function(err,user){

			if(user){
        req.user = user;
        delete req.user.password;
				req.session.user = user;
        delete req.session.user.password;
				next();
			}
		});
	}
	else{
		next();
	}
});//end of Logged In User.

http.listen(3000,function(){
  console.log("Chat App started at port : 3000");
});
