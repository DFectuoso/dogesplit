var express  = require('express'),
    swig     = require('swig'),
    conf     = require('./conf'),
    passport = require('passport'),
    flash 	 = require('connect-flash');;

var server = express();

// Prepare Store
var RedisStore = require('connect-redis')(express);

// Template engine
var swigHelpers = require('./views/helpers');

swigHelpers(swig);

server.engine('html', swig.renderFile);
server.set('view engine', 'html');
server.set('views', './views');
server.set('view cache', false);

// Swig cache just on produccion
if(conf.env === 'production'){
	swig.setDefaults({ cache: 'memory' });
}else{
	swig.setDefaults({ cache: false });
}

// Static assets
server.use(express.static('./public'));

// Server config
server.configure(function() {
	// server.use(express.logger());
	server.use(express.cookieParser());
	server.use(express.json());
	server.use(express.urlencoded());
	server.use(express.multipart());

	server.use(express.session({
		store: new RedisStore(conf.redis.options),
		secret: conf.redis.secret
	}));

	server.use(passport.initialize());
	server.use(passport.session());
	server.use(flash());
});

var localPassportConnection = require('./passport/localStrategy');
localPassportConnection(passport);

// home Controller
var homeController  = require('./controllers/home');
homeController(server);

// Models
// load model to prompt connection to the data base
require('./lib/model');
require('./models/user');


//// PARAM PARAMS PARAMS ////
var User    = require('./models/user');
var Address    = require('./models/address');

server.param('userId', function(req,res, next, id){
  User.findOne({_id:id}, function (e, user){
    if (e) return res.send(500, e);
    if (!user) return res.send(404, e);
    req.requestUser = user;
    next();
  });
});

server.param('addressId', function(req,res, next, id){
  Address.findOne({hash:id}, function (e, address){
    if (e) return res.send(500, e);
    if (!address) return res.send(404, e);
    req.address = address;
    next();
  });
});

////// END PARAMS

var cronJob = require('cron').CronJob;
var dogeApi = require('./lib/dogeapijs/index');

new cronJob('* * * * *', function(){
	Address.find({}, function (e, addresses){
		addresses.forEach(function(address){
			dogeApi.getAddressReceived(address.hash, null, function(error, balance){
			    console.log('Checamos ' + address.hash + " y tiene: "+ balance + " doges y " + address.targets.length + " targets");

			    if (balance > 0 && address.targets.length > 0) {
				    console.log('Checamos ' + address.hash + " y tiene targets y balance");
					var should_wire = true;

					for(var i = 0; i < address.targets.length; i++){
						if (balance * (address.targets[i].percentaje/100) < 6) { should_wire = false;};
					}

					if (should_wire) {
					    console.log('Checamos ' + address.hash + " y tiene targets, todos con mas de 6 para wire, should wire");
						for(var i = 0; i < address.targets.length; i++){
							var ammountToTransfer = balance * (address.targets[i].percentaje/100);
							var addressTo = address.targets[i].addressHash;
							var addressFrom = address.hash;

						    console.log('Vamos a transferir ' + ammountToTransfer + " from " + addressFrom +" to: " + addressTo);
							dogeApi.withdraw(ammountToTransfer, addressTo, function(error,transactionId){
							    console.log('Termino transaccion ' +  transactionId);
							})
						}
					};
				};
			})
		})
	});
}, null, true);


server.listen(3000);
console.log('server running at http://localhost.com:3000');
