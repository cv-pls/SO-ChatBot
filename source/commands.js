(function () {
"use strict";

var commands = {
	listen : function ( msg ) {
		return bot.callListeners( msg ) || bot.giveUpMessage( msg );
	},

	eval : function ( msg ) {
		return bot.eval( msg );
	},

	live : function () {
		if ( !bot.stopped ) {
			return 'I\'m not dead! Honest!';
		}
		bot.continue();
		return 'And on this day, you shall paint eggs for a giant bunny.';
	},

	die : function () {
		if ( bot.stopped ) {
			return 'Kill me once, shame on you, kill me twice...';
		}
		bot.stop();
		return 'You killed me!';
	},

	refresh : function() {
		window.location.reload();
    },

	forget : function ( args ) {
		var name = args.toLowerCase(),
			cmd = bot.getCommand( name );

		if ( cmd.error ) {
			return cmd.error;
		}

		if ( !cmd.canDel(args.get('user_id')) ) {
			return 'You are not authorized to delete the command ' + args;
		}

		cmd.del();
		return 'Command ' + name + ' forgotten.';
	},

	ban : function ( args ) {
		var ret = [];
		if ( args.content ) {
			args.parse().forEach( ban );
		}
		else {
			ret = Object.keys( bot.banlist ).filter( Number );
		}

		return ret.join( ' ' ) || 'Nothing to show/do.';

		function ban ( usrid ) {
			var id = Number( usrid ),
				msg;
			if ( isNaN(id) ) {
				id = args.findUserid( usrid.replace(/^@/, '') );
			}

			if ( id < 0 ) {
				msg = 'Cannot find user {0}.';
			}
			else if ( bot.isOwner(id) ) {
				msg = 'Cannot mindjail owner {0}.';
			}
			else if ( bot.banlist.contains(id) ) {
				msg = 'User {0} already in mindjail.';
			}
			else {
				bot.banlist.add( id );
				msg = 'User {0} added to mindjail.';
			}

			ret.push( msg.supplant(usrid) );
		}
	},

	unban : function ( args ) {
		var ret = [];
		args.parse().forEach( unban );

		return ret.join( ' ' );

		function unban ( usrid ) {
			var id = Number( usrid ),
				msg;
			if ( isNaN(id) ) {
				id = args.findUserid( usrid.replace(/^@/, '') );
			}

			if ( id < 0 ) {
				msg = 'Cannot find user {0}.'
			}
			else if ( !bot.banlist.contains(id) ) {
				msg = 'User {0} isn\'t in mindjail.';
			}
			else {
				bot.banlist.remove( id );
				msg = 'User {0} freed from mindjail!';
			}

			ret.push( msg.supplant(usrid) );
		}
	},

	//a lesson on semi-bad practices and laziness
	//chapter III
	info : function ( args ) {
		if ( args.content ) {
			return commandFormat( args.content );
		}

		var info = bot.info;
		return timeFormat() + ', ' + statsFormat();

		function commandFormat ( commandName ) {
			var cmd = bot.getCommand( commandName );

			if ( cmd.error ) {
				return cmd.error;
			}
			var ret =  'Command {name}, created by {creator}'.supplant( cmd );

			if ( cmd.date ) {
				ret += ' on ' + cmd.date.toUTCString();
			}

			if ( cmd.invoked ) {
				ret += ', invoked ' + cmd.invoked + ' times';
			}
			else {
				ret += ' but hasn\'t been used yet';
			}

			return ret;
		}

		function timeFormat () {
			var format = 'I awoke on {0} (that\'s about {1} ago)',

				awoke = info.start.toUTCString(),
				ago = Date.timeSince( info.start );

			return format.supplant( awoke, ago );
		}

		function statsFormat () {
			var ret = [],
				but = ''; //you'll see in a few lines

			if ( info.invoked ) {
				ret.push( 'got invoked ' + info.invoked + ' times' );
			}
			if ( info.learned ) {
				but = 'but ';
				ret.push( 'learned ' + info.learned + ' commands' );
			}
			if ( info.forgotten ) {
				ret.push( but + 'forgotten ' + info.forgotten + ' commands' );
			}
			if ( Math.random() < 0.15 ) {
				ret.push( 'teleported ' + Math.rand(100) + ' goats' );
			}

			return ret.join( ', ' ) || 'haven\'t done anything yet!';
		}
	},

	jquery : function jquery ( args ) {
		return '[GTFO](http://chat.stackoverflow.com/rooms/17/javascript)';
	},

	user : function ( args ) {
		var props = args.parse(),
			usrid = props[ 0 ] || args.get( 'user_id' ),
			id = usrid;

		//check for searching by username
		if ( !(/^\d+$/.test(usrid)) ) {
			id = args.findUserid( usrid );

			if ( id < 0 ) {
				return 'Can\'t find user ' + usrid + ' in this chatroom.';
			}
		}

		args.directreply( 'http://stackoverflow.com/users/' + id );
	},

	listcommands : function ( args ) {
		var commands = Object.keys( bot.commands ),

			valid = /^(\d+|$)/.test( args.content ),
			page = Number( args.content ) || 0,
			pageSize = 50,

			total = Math.ceil( Math.max(0, commands.length) / pageSize ) - 1;

		if ( page > total || !valid ) {
			return [
				args.codify( 'StackOverflow: Could not access page' ),
				'This unicorn has killed itself because of you',
				'Accordion to recent surveys, you suck'
			].random();
		}

		var start = page * pageSize,
			end = start + pageSize,

			ret = commands.slice( start, end ).join( ', ' );

		return ret + ' (page {0}/{1})'.supplant( page, total );;
	},

	purgecommands : function ( args ) {
		var id = args.get( 'user_id' );
		Object.keys( bot.commands ).map( mapper ).forEach( del );

		return 'The deed has been done.';

		function mapper ( cmdName ) {
			return bot.commands[ cmdName ];
		}
		function del ( cmd ) {
			if ( cmd.learned && cmd.canDel(id) ) {
				cmd.del();
			}
		}
	}
};

commands.define = (function () {
var cache = Object.create( null );

//cb is for internal usage by other commands/listeners
return function ( args, cb ) {
	//we already defined it, grab from memory
	//unless you have alzheimer
	//in which case, you have bigger problems
	if ( cache[args] ) {
		return finish( cache[args] );
	}

	IO.jsonp.ddg( 'define ' + args.toString(), finishCall );

	//the duck talked back! either the xhr is complete, or the hallucinations
	// are back
	function finishCall ( resp ) {
		var url = resp.AbstractURL,
			def = resp.AbstractText;

		bot.log( url, def, '/define finishCall input' );

		//Webster returns the definition as
		// wordName definition: the actual definition
		// instead of just the actual definition
		if ( resp.AbstractSource === 'Merriam-Webster' ) {
			def = def.replace( args + ' definition: ', '' );
			bot.log( def, '/define finishCall webster' );
		}

		if ( !def ) {
			def = 'Could not find definition for ' + args +
				'. Trying Urban Dictionary';
			bot.getCommand( 'urban' ).exec( args );
		}
		else {
			def = args + ': ' + def; //problem?
			//the chat treats ( as a special character, so we escape!
			def += ' [\\(source\\)](' + url + ')';
			//add to cache
			cache[ args ] = def;
		}
		bot.log( def, '/define finishCall output' );

		finish( def );
	}

	function finish ( def ) {
		if ( cb && cb.call ) {
			cb( def );
		}
		else {
			args.directreply( def );
		}
	}
};
}());
commands.define.async = true;

//cb is for internal blah blah blah
commands.urban = (function () {
var cache = Object.create( null );

return function ( args, cb ) {
	if ( !args.length ) {
		return 'Y U NO PROVIDE ARGUMENTS!?';
	}

	if ( cache[args] ) {
		return finish( cache[args] );
	}

	IO.jsonp({
		url : 'http://api.urbandictionary.com/v0/define',
		data : {
			term : args.content
		},
		jsonpName : 'callback',
		fun : complete
	});

	function complete ( resp ) {
		var msg;

		if ( resp.result_type === 'no_results' ) {
			msg = 'Y U NO MAEK SENSE!!!???!!?11 No results for ' + args;
		}
		else {
			msg = formatTop( resp.list[0] );
		}
		cache[ args ] = msg;

		finish( msg );
	}

	function finish ( def ) {
		if ( cb && cb.call ) {
			cb( def );
		}
		else {
			args.reply( def );
		}
	}

	function formatTop ( top ) {
		//replace [tag] in definition with links
		var def = top.definition.replace( /\[(\w+)\]/g, formatTag );

		return args.link( top.word, top.permalink ) + ' ' + def;
	}
	function formatTag ( $0, $1 ) {
		var href =
			'http://urbandictionary.com/define.php?term=' +
			encodeURIComponent( $1 )

		return args.link( $0, href );
	}
};
}());
commands.urban.async = true;

var parse = commands.parse = (function () {
var macros = {
	who : function () {
		return [].pop.call( arguments ).get( 'user_name' );
	},

	someone : function () {
		var presentUsers = document.getElementById( 'sidebar' )
			.getElementsByClassName( 'present-user' );

		//the chat keeps a low opacity for users who remained silent for long,
		// and high opacity for those who recently talked
		var active = [].filter.call( presentUsers, function ( user ) {
			return Number( user.style.opacity ) >= 0.5;
		}),
		user = active[ Math.floor(Math.random() * (active.length-1)) ];

		if ( !user ) {
			return 'Nobody! I\'m all alone :(';
		}

		return user.getElementsByTagName( 'img' )[ 0 ].title;
	},

	digit : function () {
		return Math.floor( Math.random() * 10 );
	},

	encode : function ( string ) {
		return encodeURIComponent( string );
	},

	//random number, min <= n <= max
	//treats non-numeric inputs like they don't exist
	rand : function ( min, max ) {
		min = Number( min );
		max = Number( max );
		return Math.rand( min, max );
	}
};
var macroRegex = /(?:.|^)\$(\w+)(?:\((.*?)\))?/g;

//extraVars is for internal usage via other commands
return function parse ( args, extraVars ) {
	var msgObj = ( args.get && args.get() ) || {};
	extraVars = extraVars || {};
	bot.log( args, extraVars, '/parse input' );

	return args.replace( macroRegex, replaceMacro );

	function replaceMacro ( $0, filler, fillerArgs ) {
		//$$ makes a literal $
		if ( $0.startsWith('$$') ) {
			return $0.slice( 1 );
		}

		//include the character that was matched in the $$ check, unless
		// it's a $
		var ret = '';
		if ( $0[0] !== '$' ) {
			ret = $0[ 0 ];
		}

		var macro = findMacro( filler );

		//not found? bummer.
		if ( !macro ) {
			return filler;
		}

		bot.log( macro, filler, fillerArgs, '/parse replaceMacro' );
		//when the macro is a function
		if ( macro.apply ) {
			ret += macro.apply( null, parseMacroArgs(fillerArgs) );
		}
		//when the macro is simply a substitution
		else {
			ret += macro;
		}
		return ret;
	}

	function parseMacroArgs ( macroArgs ) {
		bot.log( macroArgs, '/parse parseMacroArgs' );
		if ( !macroArgs ) {
			return [];
		}

		//parse the arguments, split them into individual arguments,
		// and trim'em (to cover the case of "arg,arg" and "arg, arg")
		return (
			parse( macroArgs, extraVars )
				.split( ',' ).invoke( 'trim' ).concat( args )
		);
		//this is not good code
	}

	function findMacro ( macro ) {
		var user = bot.users[ args.get('user_id') ],
			container = [ macros, msgObj, user, extraVars ].first( hasMacro );

		return ( container || {} )[ macro ];

		function hasMacro ( obj ) {
			return obj.hasOwnProperty( macro );
		}
	}
};
}());

commands.tell = (function () {
var invalidCommands = { tell : true, forget : true };

return function ( args ) {
	var props = args.parse();
	bot.log( args.valueOf(), props, '/tell input' );

	var replyTo = props[ 0 ],
		cmdName = props[ 1 ],
		cmd;

	if ( !replyTo || !cmdName ) {
		return 'Invalid /tell arguments. Use /help for usage info';
	}

	cmdName = cmdName.toLowerCase();
	cmd = bot.getCommand( cmdName );
	if ( cmd.error ) {
        return;
		return cmd.error;
	}

	if ( invalidCommands.hasOwnProperty(cmdName) ) {
		return 'Command ' + cmdName + ' cannot be used in /tell.';
	}

	if ( !cmd.canUse(args.get('user_id')) ) {
		return 'You do not have permission to use command ' + cmdName;
	}

	//check if the user's being a fag
	if ( /^@/.test(replyTo) ) {
		return 'Don\'t be annoying, drop the @, nobody likes a double-ping.';
	}

	//check if the user wants to reply to a message
	var direct = false,
		extended = {};
	if ( /^:?\d+$/.test(replyTo) ) {
		extended.message_id = replyTo.replace( /^:/, '' );
		direct = true;
	}
	else {
		extended.user_name = replyTo;
	}

	var msgObj = Object.merge( args.get(), extended );
	var cmdArgs = bot.Message(
		//the + 2 is for the two spaces after each arg
		// /tell replyTo1cmdName2args
		args.slice( replyTo.length + cmdName.length + 2 ).trim(),
		msgObj );
	bot.log( cmdArgs, '/tell calling ' + cmdName );

	//if the command is async, it'll accept a callback
	if ( cmd.async ) {
		cmd.exec( cmdArgs, callFinished );
	}
	else {
		callFinished( cmd.exec(cmdArgs) );
	}

	function callFinished ( res ) {
		if ( !res ) {
			return;
		}

		if ( direct ) {
			cmdArgs.directreply( res );
		}
		else {
			cmdArgs.reply( res );
		}
	}
};
}());

commands.mdn = function ( args, cb ) {
	IO.jsonp.google(
		args.toString() + ' site:developer.mozilla.org', finishCall );

	function finishCall ( resp ) {
		if ( resp.responseStatus !== 200 ) {
			finish( 'Something went on fire; status ' + resp.responseStatus );
			return;
		}

		var result = resp.responseData.results[ 0 ];
		bot.log( result, '/mdn result' );
		finish( result.url );
	}

	function finish ( res ) {
		if ( cb && cb.call ) {
			cb( res );
		}
		else {
			args.reply( res );
		}
	}
};
commands.mdn.async = true;

var descriptions = {
	ban : 'Bans user(s) from using me. Lacking arguments, prints the banlist.' +
		' `/ban [usr_id|usr_name, [...]`',
	choose : '"Randomly" choose an option given. `/choose option0 option1 ...`',
	define : 'Fetches definition for a given word. `/define something`',
	die  : 'Kills me :(',
	eval : 'Forwards message to javascript code-eval',
	forget : 'Forgets a given command. `/forget cmdName`',
	get : 'Grabs a question/answer link (see online for thorough explanation)',
	help : 'Fetches documentation for given command, or general help article.' +
		' `/help [cmdName]`',
	info : 'Grabs some stats on my current instance or a command.' +
		' `/info [cmdName]`',
	jquery : 'Fetches documentation link from jQuery API. `/jquery what`',
	listcommands : 'Lists commands. `/listcommands [page=0]`',
	listen : 'Forwards the message to my ears (as if called without the /)',
	live : 'Resurrects me (:D) if I\'m down',
	mdn : 'Fetches mdn documentation. `/mdn what`',
	norris : 'Random chuck norris joke!',
	parse : 'Returns result of "parsing" message according to the my mini' +
		'-macro capabilities (see online docs)',
	purgecommands : 'Deletes all user-taught commands.',
	refresh : 'Reloads the browser window I live in',
	regex : 'Executes a regex against text input. `/regex text regex [flags]`',
	tell : 'Redirect command result to user/message.' +
		' /tell `msg_id|usr_name cmdName [cmdArgs]`',
	unban : 'Removes a user from my mindjail. `/unban usr_id|usr_name`',
	urban : 'Fetches UrbanDictionary definition. `/urban something`',
	user : 'Fetches user-link for specified user. `/user usr_id|usr_name`',
};

//only allow owners to use certain commands
var privilegedCommands = {
	die : true, live  : true,
	ban : true, unban : true,
	refresh : true, purgecommands : true
};
//voting-based commands for unpriviledged users
var communal = {
	die : true, ban : true
};

Object.iterate( commands, function ( cmdName, fun ) {
	var cmd = {
		name : cmdName,
		fun  : fun,
		permissions : {
			del : 'NONE',
			use : privilegedCommands[ cmdName ] ? bot.owners : 'ALL'
		},
		description : descriptions[ cmdName ],
		async : commands[ cmdName ].async
	};

	if ( communal[cmdName] ) {
		cmd = bot.CommunityCommand( cmd );
	}
	bot.addCommand( cmd );
});

}());
