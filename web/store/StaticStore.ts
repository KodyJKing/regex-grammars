import { Store } from "./Store.js"

export class StaticStore<K, V> implements Store<K, V> {

    constructor( private readonly map: Map<K, V> ) {
    }

    writable( key: K ): boolean {
        return false
    }

    has( key: K ): boolean {
        return this.map.has( key )
    }

    get( key: K ): V | undefined {
        return this.map.get( key )
    }

    set( key: K, value: V | undefined ): void {
        throw new Error( "StaticStore is read only" )
    }

    watch( key: K, callback: ( value: V | undefined ) => void ): () => void {
        callback( this.map.get( key ) )
        return () => { }
    }

    watchKeys( callback: ( keys: K[] ) => void ): () => void {
        callback( Array.from( this.map.keys() ) )
        return () => { }
    }

    keys(): K[] {
        return Array.from( this.map.keys() )
    }

}