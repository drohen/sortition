import type * as sqlite from "https://deno.land/x/sqlite/mod.ts"
import { DataProvider } from "./core.ts"

enum DataType 
{
	string = `TEXT`,
	int = `INTEGER`,
	blob = `BLOB`
}

export interface Hub
{
	id: string
	created: number
	active: number
}

export interface DataItem
{
	id: string
	hub_id: string
	added: number
	active: number
	count: number
	content: Uint8Array
}

export interface DBUUIDProvider
{
	uuid(): Promise<string>
}

export class DB implements DataProvider
{
	private emptyHub: Hub

	private emptyData: DataItem

	constructor(
		private db: sqlite.DB,
		private uuid: DBUUIDProvider )
	{
		this.createHub = this.createHub.bind( this )

		this.getData = this.getData.bind( this )

		this.deactivateData = this.deactivateData.bind( this )

		this.addData = this.addData.bind( this )

		this.deactivateHub = this.deactivateHub.bind( this )

		this.emptyData = {
			id: ``,
			added: 0,
			active: 0,
			content: new Uint8Array(),
			count: 0,
			hub_id: ``
		}

		this.emptyHub = {
			id: ``,
			created: 0,
			active: 0
		}

		this.init()
	}

	private init()
	{
		this.db.query(
			this.createTableQuery(
				`hubs`,
				[
					[ `id`, DataType.string ],
					[ `created`, DataType.int ],
					[ `active`, DataType.int ]
				]
			),
			[]
		)

		this.db.query(
			this.createTableQuery(
				`datas`,
				[
					[ `id`, DataType.string ],
					[ `hub_id`, DataType.string ],
					[ `added`, DataType.int ],
					[ `active`, DataType.int ],
					[ `count`, DataType.int ],
					[ `content`, DataType.blob ]
				]
			),
			[]
		)
	}

	/**
	 * Fn to reduce code repitition and help creating tables
	 * @param table table name
	 * @param values column names
	 */
	private createTableQuery( 
		table: string,
		values: [string, DataType][] 
	): string 
	{
		return [
			`CREATE TABLE IF NOT EXISTS`,
			table,
			`(${values.map( ( v ) => v.join( ` ` ) ).join( `, ` )});`
		].join( ` ` )
	}

	private hub( id: string, created: number, active: number ): Hub
	{
		if ( typeof id !== `string` || typeof created !== `number` || typeof active !== `number` )
			throw Error( `Hub data is invalid.` )

		return { id, created, active }
	}

	private dataItem(
		id: string,
		hub_id: string,
		added: number,
		active: number,
		count: number,
		content: Uint8Array,
	): DataItem
	{
		if ( typeof id !== `string`
			|| typeof hub_id !== `string`
			|| typeof added !== `number`
			|| typeof active !== `number`
			|| typeof count !== `number` )
			throw Error( `Data item is invalid` )

		return { id, hub_id, active, added, content, count }
	}

	private updateCount( data: DataItem ): void
	{
		try 
		{
			this.db.query(
				`UPDATE datas SET count = $count WHERE id = $id;`,
				{ $id: data.id, $count: data.count + 1 },
			)
		}
		catch ( e )
		{
			throw Error( `Could not update data item ${e.message}` )
		}
	}

	public getData( hubId: string ): DataItem
	{
		try
		{
			const rows = this.db.query(
				[
					// returns random entry from top 50% least chosen records
					// for the given hub id
					`SELECT * FROM datas`,
					`WHERE hub_id = $hubId AND active = 1 ORDER BY count ASC`,
					`LIMIT 1 OFFSET ABS(RANDOM()) %`,
					`MAX((SELECT ROUND(COUNT(*) * 0.5) FROM datas`,
					`WHERE hub_id = $hubId AND active = 1), 1);`
				].join( ` ` ),
				{ $hubId: hubId }
			)

			const row = rows.next()

			if ( row.done )
			{
				return this.emptyData
			}
			else
			{
				const [ id, hub_id, added, active, count, content ] = row.value

				const dataItem = this.dataItem( id, hub_id, added, active, count, content )

				this.updateCount( dataItem )

				return dataItem
			}
		}
		catch ( e )
		{
			throw Error( `Could not get data ${e.message}` )
		}
	}

	private setInactive( data: DataItem ): void
	{
		try 
		{
			this.db.query(
				`UPDATE datas SET active = 0 WHERE id = $id;`,
				{ $id: data.id },
			)
		}
		catch ( e )
		{
			console.error( e )

			throw Error( `Could not deactivate data item ${e.message}` )
		}
	}

	public deactivateData( id: string ): DataItem 
	{
		try
		{
			const rows = this.db.query(
				`SELECT * FROM datas WHERE id = $id LIMIT 1`,
				{ $id: id },
			)

			const row = rows.next()

			if ( row.done )
			{
				return this.emptyData
			}
			else
			{
				const [ id, hub_id, added, active, count, content ] = row.value

				const dataItem = this.dataItem( id, hub_id, added, active, count, content )

				if ( row.value[ 0 ].active !== 0 ) this.setInactive( dataItem )

				return dataItem
			} 
		}
		catch ( e )
		{
			throw Error( `Could not deactivate data ${e.message}` )
		}
	}

	public async addData( hubId: string, data: Uint8Array ): Promise<DataItem> 
	{
		const item: DataItem = {
			id: await this.uuid.uuid(),
			added: Date.now(),
			active: 1,
			content: data,
			count: 0,
			hub_id: hubId
		}

		try
		{
			this.db.query(
				[
					`INSERT INTO datas VALUES`,
					`($id, $hubId, $added, $active, $count, $content)`
				].join( ` ` ),
				{
					$id: item.id,
					$hubId: item.hub_id,
					$added: item.added,
					$active: item.active,
					$count: item.count,
					$content: item.content
				}
			)

			return item
		}
		catch ( e )
		{
			throw Error( `Could not add data ${e.message}` )
		}
	}

	private setHubInactive( hub: Hub ): void
	{
		try
		{
			this.db.query(
				`UPDATE hubs SET active = 0 WHERE id = $id`,
				{ $id: hub.id }
			)
		}
		catch ( e )
		{
			throw Error( `Could not deactivate hub ${e.message}` )
		}
	}

	public deactivateHub( id: string ): Hub
	{
		try
		{
			const rows = this.db.query(
				`SELECT * FROM hubs WHERE id = $id LIMIT 1`,
				{ $id: id }
			)

			const row = rows.next()

			if ( row.done )
			{
				return this.emptyHub
			}
			else
			{
				const [ id, created, active ] = row.value

				const hub = this.hub( id, created, active )

				if ( row.value[ 0 ].active !== 0 ) this.setHubInactive( hub )

				return hub
			}
		}
		catch ( e )
		{
			throw Error( `Could not deactivate hub ${e.message}` )
		}
	}

	public async createHub(): Promise<Hub> 
	{
		const hub: Hub = {
			id: await this.uuid.uuid(),
			created: Date.now(),
			active: 1
		}

		try
		{
			this.db.query(
				`INSERT INTO hubs values($id, $created, $active)`,
				{
					$id: hub.id,
					$created: hub.created,
					$active: hub.active
				}
			)

			return hub
		}
		catch ( e )
		{
			throw Error( `Could not create hub ${e.message}` )
		}
	}
}