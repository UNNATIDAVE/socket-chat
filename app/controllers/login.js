var express = require('express');
var mongoose = require('mongoose');
var shortid = require("shortid");
var router = express.Router();

//middlewares
var auth = require('../../middlewares/auth.js');
var validator = require('../../middlewares/validator.js');

var encrypt = require('../../library/encrypt.js');

var userModel = mongoose.model('user');

module.exports.controller = function(app){

  // route for home page
  router.get('/',function(req,res){
    res.redirect('/login');
  });

  //route for login
  router.get('/login',auth.loggedIn,function(req,res){
    res.render('login',
                {
                  title: "User Login",
                  user: req.session.user,
                  chat: req.session.chat
                });
  });

  //route for logout
  router.get('/logout',function(req,res){

    delete req.session.user;
    res.redirect('/login');

  });

  //route for login
  router.post('/login/user',auth.loggedIn,function(req,res){

    var epass = encrypt.encryptPassword(req.body.password);

    userModel.findOne({$and:[{'email':req.body.email},{'password':epass}]},function(err,result){
      if(err){
        res.render('message',
                    {
                      title:"Error",
                      msg:"Some Error Occured During Login.",
                      status:500,
                      error:err,
                      user:req.session.user,
                      chat:req.session.chat
                    });
      }
      else if(result == null || result == undefined || result == ""){
        res.render('message',
                    {
                      title:"Error",
                      msg:"User Not Found. Please check your Username and Password.",
                      status:404,
                      error:"",
                      user:req.session.user,
                      chat:req.session.chat
                    });
      }
      else{
        req.user = result;
        delete req.user.password;
        req.session.user = result;
        delete req.session.user.password;
        res.redirect('/chat');
      }
    });
  });   // End login route

  //route for signup
  router.get("/signup",auth.loggedIn,function(req,res){
    res.render('signup',
                {
                  title:"User Signup",
                  user:req.session.user,
                  chat:req.session.chat
                });
  });

  // code to create new user
  router.post("/signup/user",auth.loggedIn,validator.emailExist,function(req,res){

    var today = Date.now();
    var id = shortid.generate();
    var epass = encrypt.encryptPassword(req.body.password);

    //create user.
    var newUser = new userModel({

      userId : id,
      username : req.body.username,
      email : req.body.email,
      password : epass,
      createdOn : today,
      updatedOn : today

    });

    newUser.save(function(err,result){
      if(err){
        console.log(err);
        res.render('message',
                    {
                      title:"Error",
                      msg:"Some Error Occured During Creation.",
                      status:500,
                      error:err,
                      user:req.session.user,
                      chat:req.session.chat
                    });
      }
      else if(result == undefined || result == null || result == ""){
        res.render('message',
                    {
                      title:"Empty",
                      msg:"User Is Not Created. Please Try Again.",
                      status:404,
                      error:"",
                      user:req.session.user,
                      chat:req.session.chat
                    });
      }
      else{
        req.user = result;
        delete req.user.password;
        req.session.user = result;
        delete req.session.user.password;
        res.redirect('/chat');
      }
    });

  }); // end of signup user

  app.use('/',router);

}
