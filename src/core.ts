import { serve, Server } from "https://deno.land/std/http/server.ts"
import * as sqlite from "https://deno.land/x/sqlite/mod.ts"
import { Random } from './random.ts'
import { DB, DBUUIDProvider, Hub } from './db.ts'
import { DataHandler, HandlerUUIDProvider, Handler } from './dataHandler.ts'
import { RequestDataProvider, RequestHandler, RequestsActionsProvider, RequestsUUIDProvider } from './requestHandler.ts'

export type RandomProvider = 
	& DBUUIDProvider
	& HandlerUUIDProvider
	& RequestsUUIDProvider

export type DataProvider = 
	& RequestDataProvider

export type ActionsProvider = RequestsActionsProvider

export class Core implements ActionsProvider
{
	private db: sqlite.DB

	private server: Server

	private requestHandler: RequestHandler

	private dbAPI: DB

	private random: Random

	private handlers: Handler[]

	private encoder: TextEncoder

	public createHub: () => Promise<Hub>

	constructor( private port: number, private dbPath: string )
	{
		this.random = new Random( 20 )

		this.db = new sqlite.DB( this.dbPath )

		this.dbAPI = new DB( this.db, this.random )

		this.server = serve( `0.0.0.0:${this.port}` )

		this.encoder = new TextEncoder()

		this.handlers = [ new DataHandler( this.encoder, this.random ) ]

		this.createHub = this.dbAPI.createHub

		this.requestHandler = new RequestHandler( this.handlers, this.random, this, this.dbAPI, this.encoder )
	}

	/**
	 * Server should close and close DB connection on end
	 */
	private close()
	{
		this.db.close()

		this.server.close()
	}

	public async run(): Promise<void>
	{
		try 
		{
			for await ( const req of this.server ) 
			{
				await this.requestHandler.handle( req )
			}
	
			this.close()
		}
		catch ( e ) 
		{
			this.close()

			throw e
		}
	}
}