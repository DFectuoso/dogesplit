// ToDo: move image uploader to a pipe, avoid to have the image in the heap.
var controller = require('stackers'),
	_ = require('underscore');

var dogeApi = require('../lib/dogeapijs/index')

var User = require('../models/user');
var Address = require('../models/address');

var homeController = controller({
	path : ''
});

// attach all other controllers
homeController.attach(require('./user'));
homeController.attach(require('./admin/users.js'));

// Fetch user middle ware
homeController.beforeEach(function(req, res, next){
	if(req.session && req.session.passport && req.session.passport.user)
		var query = User.findOne({email : req.session.passport.user.email },function(err, user){
			if(err) return res.send(500);

			if(user){
				req.body.user = _.pick(user.toJSON(), 'username', 'avatar', 'role');
				req.user = user;
			}

			next();
		});
	else 
		next();
});

// This is the main log in, no reason to have anything else
homeController.get('', function (req, res) {
	if (req.user) {
		res.redirect("/dashboard")
	} else {
		res.render('home/home',{ messageLogin: req.flash('loginMessage') });		
	}
});

// This is the main dashboard
homeController.get('/dashboard', User.isLoggedIn, function (req, res) {
	Address.find({user:req.user}, function (e, addresses){
		if (e) return res.send(500, e);
		req.addresses = addresses;

		res.render('home/dashboard', req);
	});
});

// This is the main dashboard
homeController.get('/new-address', User.isLoggedIn, function (req, res) {
	dogeApi.getNewAddress("", function (error, addressHash) {
		if(error) return res.send(500, error);

		var address = new Address({
			hash	:   JSON.parse(addressHash),
			user    :   req.user
		});

		address.save(function(err){
			if(err) return res.send(500, err);

			res.redirect("/address/"+ address.hash)
		})
	});
});

// This is the main dashboard
homeController.get('/address/:addressId', User.isLoggedIn, /*IMPORTANT Address.isForUser() */ function (req, res) {
	// Check that the user is owner of this address too
	res.render('address/info', req);
});


// This is the main dashboard
homeController.post('/address/:addressId', User.isLoggedIn, /*IMPORTANT Address.isForUser() */ function (req, res) {
	// Check that the user is owner of this address too
	var targets = [];

console.log(req.body.targetAddress.length);

	var total = 0;
	for (var i = 0; i < req.body.targetAddress.length; i++) {
		var percentaje = parseFloat(req.body.percentaje[i])

		console.log("Percentaje: "+ percentaje);
		console.log("total: " + total);
		total = percentaje + total;

		targets.push({
			addressHash  : req.body.targetAddress[i], 
			percentaje   : percentaje, 
		})
	};

	console.log("TOTAL = " + total);
	if(total == 100){
		req.address.targets = targets;
		console.log(targets);
		req.address.save(function(err){
			if(err) return res.send(500, err);

			res.render('address/info', req);
		})
	} else {
		req.error = "Percentajes don't sum up to 100";
		res.render('address/info', req);
	}
});


module.exports = homeController;