var model  = require('./../lib/model'),
	schema = model.Schema;

var _ = require('underscore');

var modelSchema = schema({
	createdDate : {type : Date, default: Date.now },
	hash        : {type : String, required : true},
	user        : { type: schema.Types.ObjectId, ref: 'user', required : true },
	targets  	: [{ 
		addressHash : {type : String},
		percentaje : {type : Number},
	}],
});

var Address = model.model('address', modelSchema);

module.exports = Address;