import type { ServerRequest } from "https://deno.land/std/http/server.ts"
import type { DataItem, Hub } from "./db.ts"
import type { Handler } from "./dataHandler.ts"

export interface RequestsUUIDProvider
{
	validateUUID: ( uuid: string ) => boolean
}

export interface RequestsActionsProvider
{
	createHub: () => Promise<Hub>
}

export interface RequestDataProvider
{
	getData: ( id: string ) => DataItem
	addData: ( id: string, data: Uint8Array ) => Promise<DataItem>
	deactivateData: ( id: string ) => DataItem
}

export class RequestHandler
{
	constructor(
		private handlers: Handler[],
		private uuid: RequestsUUIDProvider,
		private actions: RequestsActionsProvider,
		private data: RequestDataProvider,
		private encoder: TextEncoder
	)
	{}

	public async handle( req: ServerRequest ): Promise<void>
	{
		try
		{
			const { url }: ServerRequest = req

			if ( !url || url.length > 1024 ) 
			{
				this.invalid( req )
			}
			else if ( url === `/create` ) 
			{
				await this.handleBaseRequests( req )
			}
			else 
			{
				const headers = new Headers()
	
				this.setCors( headers )
	
				const uuid: string = url.split( `/` )[ 1 ]
	
				const valid: boolean = this.uuid.validateUUID( uuid )
	
				if ( !valid )
				{
					this.invalid( req )
	
					return
				}
	
				await this.handleHubRequests( req, uuid )
			}
		}
		catch ( e )
		{
			req.respond( {
				status: 500,
				body: this.encode( e.message )
			} )
		}
	}

	/**
	 * Encoder to be reused throughout requests
	 */
	private encode( text: string ): Uint8Array
	{
		return this.encoder.encode( text )
	}

	private invalid( req: ServerRequest )
	{
		req.respond( {
			status: 404,
			body: this.encode( `Invalid path` ),
		} )
	}

	private async handleBaseRequests( req: ServerRequest ) 
	{
		switch ( req.method ) 
		{
			case `POST`:

				req.respond( {
					status: 200,
					body: this.encode( ( await this.actions.createHub() ).id )
				} )

				break

			case `OPTIONS`:

				req.respond( { status: 200 } )

				break

			default:

				req.respond( {
					status: 405,
					body: this.encode( `Not handled: ${req.method}` )
				} )
		}
	}

	private async handleHubRequests( req: ServerRequest, hubID: string ) 
	{
		switch ( req.method ) 
		{
			case `GET`:

				this.handlers[ 0 ].onGet( req, this.data.getData( hubID ) )

				break

			case `PUT`:

				try
				{
					this.handlers[ 0 ].onAdd( 
						req, 
						await this.data.addData(
							hubID, 
							await this.handlers[ 0 ].validateAdd( req ) ) )
				}
				catch ( e )
				{
					console.log( e )
					
					throw Error( `Bad request` )
				}

				break

			case `DELETE`:

				try
				{
					this.handlers[ 0 ].onDelete(
						req,
						this.data.deactivateData( 
							await this.handlers[ 0 ].validateDelete( req )
						) )
				}
				catch ( e )
				{
					console.log( e )
					
					throw Error( `Bad request` )
				}
				
				break

			case `OPTIONS`:

				req.respond( { status: 200 } )

				break

			default:

				req.respond( {
					status: 405,
					body: this.encode( `${req.method}` )
				} )
		}
	}

	private setCors( headers: Headers ): void 
	{
		headers.set( `Access-Control-Allow-Origin`, `*` )

		headers.set( `Access-Control-Request-Method`, `*` )

		headers.set(
			`Access-Control-Allow-Methods`,
			`OPTIONS, GET, PUT, DELETE`
		)

		headers.set( `Access-Control-Allow-Headers`, `*` )
	}
}