import type { ServerRequest } from "https://deno.land/std/http/server.ts"
import { iter } from "https://deno.land/std/io/util.ts"
import type { DataItem } from "./db.ts"

export interface HandlerUUIDProvider
{
	validateUUID: ( uuid: string ) => boolean
}

type Fn = (
	request: ServerRequest,
	data: DataItem
) => void

export interface Handler
{
	/**
	 * After item is deleted from DB, this event is called
	 * Used to return a given message/ data
	 */
	onDelete: Fn

	/**
	 * After request to get item from DB, this event is called
	 * Can be used to return the fetched item or some partial data
	 */
	onGet: Fn

	/**
	 * After item is added to DB, this event is called
	 * Can be used to return some data/partial
	 */
	onAdd: Fn

	/**
	 * On request to add data, this event is called to parse the
	 * request, and return data to be added to DB
	 */
	validateAdd: ( request: ServerRequest ) => Promise<Blob>

	/**
	 * When delete request is made, this event is called to parse
	 * the request, and indicate what data to be deleted
	 */
	validateDelete: ( request: ServerRequest ) => Promise<string>
}

export class DataHandler implements Handler
{
	constructor( private encoder: TextEncoder, private uuid: HandlerUUIDProvider )
	{}

	private async getString( req: ServerRequest, sizeLimit: number ): Promise<string>
	{
		const { headers } = req

		const type: string = headers.get( `content-type` ) || ``

		const size: number = parseInt( headers.get( `content-length` ) || `${sizeLimit + 1}`, 10 )

		let downloaded = 0

		if ( type !== `text/plain` ) 
		{
			throw Error( `Incorrect content type ${type}` )
		}
		else if ( size > sizeLimit ) 
		{
			throw Error( `Too much data` )
		}
		else 
		{
			const data: Uint8Array[] = []

			const chunks = iter( req.body )

			for await ( const chunk of chunks )
			{
				downloaded += chunk.length

				data.push( chunk )

				if ( downloaded > sizeLimit ) 
				{
					throw Error( `Too much data` )
				}
			}

			return data.join( `` )
		}
	}

	public onAdd( req: ServerRequest, data: DataItem ): void 
	{
		req.respond( {
			status: 200,
			body: this.encoder.encode( data.id )
		} )
	}

	// TODO: send message to url to see if ok to redirect and also check if alive/add request IP to their "whitelist", then redirect
	// TODO: check if user is requesting in < 5 second intervals, if so, add warning, then ban if > 2 warnings and issue black list message to icecast
	public async onGet( req: ServerRequest, data: DataItem ): Promise<void>
	{
		if ( data.id !== `` ) 
		{
			const headers = new Headers()

			headers.append( `Location`, await data.content.text() )

			req.respond( {
				status: 302,
				headers 
			} )
		}
		else
		{
			req.respond( { status: 200 } )
		}
	}

	public onDelete( req: ServerRequest ): void
	{
		req.respond( { status: 200 } )
	}

	public async validateAdd( req: ServerRequest ): Promise<Blob> 
	{
		return new Blob( [ await this.getString( req, 1024 ) ] )
	}

	public async validateDelete( req: ServerRequest ): Promise<string> 
	{
		try 
		{
			const uuid: string = await this.getString( req, 36 )

			if ( !this.uuid.validateUUID( uuid ) ) 
			{
				throw Error( `Invalid data` )
			}

			return uuid
		}
		catch ( error ) 
		{
			throw Error( `Error parsing data` )
		}
	}

	
}