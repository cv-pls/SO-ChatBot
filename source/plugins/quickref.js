(function () {

function quickref ( args, cb ) {
	IO.jsonp({
		url: 'http://jsonp.pieterhordijk.com',
		jsonpName : 'callback',
		data : {
			q : args.toString()
		},
		fun : finishCall
	});

	function finishCall ( resp ) {
		bot.log( resp, '/quickref response' );
		/*
		if ( resp.responseStatus !== 200 ) {
			finish( 'php.net; status ' + resp.responseStatus );
			return;
		}
		*/

		bot.log( resp, '/quickref results' );

		if ( !resp ) {
			finish( 'Not found in the quick reference' );
			return;
		}
		finish( resp );
	}

	function finish ( res ) {
		bot.log( res, '/quickref final' );
		//if ( cb && cb.call ) {
		//	cb( res );
		//}
		//else {
			args.reply( res.result );
		//}
	}
}

bot.addCommand({
	name : 'quickref',
	fun  : quickref,
	permissions : {
		del : 'NONE'
	},
	description : 'Search the Quick reference. `/quickref query`',
	async : true
});
}());
