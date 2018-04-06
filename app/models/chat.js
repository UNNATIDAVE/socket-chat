var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var chatSchema = new Schema({

  msgFrom : {type: String, default :"", required: true},
  msgTo : {type: String, default :"", required: true},
  msg : {type: String, default : "", required: true},
  room : {type: String, default : "", required: true},
  createdOn : {type: Date, default : Date.now}

});
mongoose.model('chat',chatSchema);

var roomSchema = new Schema({

  name1 : {type: String, default: "", required: true},
  name2 : {type: String, default: "", required: true},
  members : [],
  lastActive : {type: Date, default: Date.now},
  createdOn : {type: Date, default: Date.now}
});

mongoose.model('room',roomSchema);