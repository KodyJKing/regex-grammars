import { Store } from "./Store.js"

// A read only store that uses a query string to store a single value.
export class QueryStore<V> implements Store<string, V> {

    static createLink( keyName: string, valueName: string, key: string, value: string ): string {
        const params = new URLSearchParams( window.location.search )
        params.set( keyName, key )
        params.set( valueName, value )
        return window.location.pathname + "?" + params.toString()
    }

    private key: string | null
    private value: V | undefined

    constructor( private readonly keyName: string, private readonly valueName: string ) {
        const params = new URLSearchParams( window.location.search )
        this.key = params.get( this.keyName )
        const valueJSON = params.get( this.valueName )
        this.value = valueJSON === null ? undefined : JSON.parse( valueJSON )
    }

    writable( key: string ): boolean { return false }

    has( key: string ): boolean {
        return key === this.key
    }

    get( key: string ): V | undefined {
        if ( key === this.key )
            return this.value
        return undefined
    }

    set( key: string, value: V | undefined ): void {
        throw new Error( "QueryStore is read only" )
    }

    watch( key: string, callback: ( value: V | undefined ) => void ): () => void {
        if ( key === this.key )
            callback( this.value )
        return () => { }
    }

    watchKeys( callback: ( keys: string[] ) => void ): () => void {
        callback( this.key === null ? [] : [ this.key ] )
        return () => { }
    }

    keys(): string[] {
        return this.key === null ? [] : [ this.key ]
    }

}