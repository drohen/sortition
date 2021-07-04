import { Core } from "./core.ts"
import * as path from "https://deno.land/std/path/mod.ts"
import * as fs from "https://deno.land/std/fs/mod.ts"
import { parse, Args } from "https://deno.land/std/flags/mod.ts"
import { Configure } from "./configure.ts"
import { Random } from "./random.ts"
import { cli } from "./cliHelp.ts"


class Sortition
{
	private core?: Core

	private config?: Configure

	private cli: string

	public static init()
	{
		try 
		{
			new Sortition()
		}
		catch ( e )
		{
			console.error( e )

			console.log( `Try: deno run src/sortition.ts --help` )
		}
	}

	constructor()
	{
		this.cli = cli

		this.parseArgs()
			.then( () =>
			{
				if ( this.core )
				{
					this.core.run()
				}
				else if ( this.config )
				{
					return this.config.generate()
				}
			} )
			.catch( ( e ) =>
			{
				console.error( e )

				console.log( `Try: deno run src/sortition.ts --help` )
			} )
	}

	private printAPI()
	{
		console.log( this.cli )
	}

	/**
	 * Generate nginx/system files based on provided config flags
	 * 
	 * This function will parse the given flags, it will error on
	 * and incorrect type or value.
	 * 
	 * Test mode will just output config file
	 * Development mode will create a local nginx server
	 * Production mode will create a system service
	 * 
	 * @param flags flags passed at CLI, see cliHelp.ts for information
	 */
	private async configure( flags: Args )
	{
		const reqArgs: string[] = [ `nginx`, `host`, `port`, `dir` ]

		const flagKeys: string[] = Object.keys( flags )

		const invalidArgs: string[] = reqArgs.reduce<string[]>( ( p, a ) => 
		{
			if ( !flagKeys.includes( a ) ) 
			{
				p.push( `Missing arg: ${a}` )
			}

			return p
		}, [] )

		if ( invalidArgs.length ) 
		{
			throw Error( invalidArgs.join( `\n` ) )
		}

		const environment = flags.test
			? `test`
			: flags.production
				? `production`
				: `development`

		const idLength = flags.idLength ? parseInt( flags.idLength, 10 ) : undefined

		if ( idLength !== undefined && isNaN( idLength ) )
		{
			throw Error( `ID Length ${idLength} is not a number.` )
		}

		const nginxPort = parseInt( flags.nginx )

		if ( isNaN( nginxPort ) )
		{
			throw Error( `nginx port ${nginxPort} is not a number` )
		}

		const port = parseInt( flags.port, 10 )

		if ( isNaN( port ) )
		{
			throw Error( `sortition server port ${port} is not a number.` )
		}

		const rootDir: string = flags.dir

		if ( environment === `production` )
		{
			let fail = false

			if ( !idLength )
			{
				console.log( `Missing arg: idLength, required for production` )

				fail = true
			}

			if ( !flags.idAlphabet )
			{
				console.log( `Missing arg: idAlphabet, required for production` )

				fail = true
			}

			if ( fail ) throw Error()
		}
		
		this.config = new Configure(
			environment,
			nginxPort,
			flags.host,
			port,
			rootDir,
			flags.conf,
			flags.service
		)
	}

	private async server( flags: Args )
	{
		const reqArgs: string[] = [ `dir`, `port`, `idLength`, `idAlphabet` ]

		const flagKeys: string[] = Object.keys( flags )

		const invalidArgs: string[] = reqArgs.reduce<string[]>( ( p, a ) => 
		{
			if ( !flagKeys.includes( a ) ) 
			{
				p.push( `Missing arg: ${a}` )
			}

			return p
		}, [] )

		if ( invalidArgs.length ) 
		{
			throw Error( invalidArgs.join( `\n` ) )
		}

		const rootDir: string = flags.dir

		// use db file for sqlite db
		const dbPath: string = path.join( rootDir, `db` )

		if ( !await fs.exists( dbPath ) ) 
		{
			await Deno.create( dbPath )
		}

		const port = parseInt( flags.port, 10 )

		if ( isNaN( port ) )
		{
			throw Error( `Port ${port} is not a number.` )
		}

		const idLength = parseInt( flags.idLength, 10 )

		if ( isNaN( idLength ) )
		{
			throw Error( `ID Length ${idLength} is not a number.` )
		}

		this.core = new Core( port, dbPath, idLength, flags.idAlphabet )
	}

	/**
	 * Decide whether to generate config or run server
	 */
	public async parseArgs()
	{
		const flags: Args = parse( Deno.args )

		if ( flags.help )
		{
			this.printAPI()
		}
		else if ( flags.configure )
		{
			await this.configure( flags )
		}
		else
		{
			await this.server( flags )
		}
	}
}

Sortition.init()