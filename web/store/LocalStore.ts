import { Multimap } from "./Multimap.js"
import { Store, Unwatcher } from "./Store.js"

// A wrapper for LocalStorage to implement the Store interface.
export class LocalStore<V> implements Store<string, V> {

    watchers: Multimap<string, ( value: V | undefined ) => void> = new Multimap()
    allWatchers: Set<( entries: [ string, V ][] ) => void> = new Set()
    keysWatchers: Set<( keys: string[] ) => void> = new Set()

    constructor( public readonly prefix: string ) {
        this.initStorageCallback()
    }

    initStorageCallback() {
        const storageCallback = ( event: StorageEvent ) => {
            if ( event.key?.startsWith( this.prefix ) ) {
                const key = this.extractKey( event.key )
                const value = this.deserialize( event.newValue )
                this.notify( key, value )
            }
        }
        window.addEventListener( "storage", storageCallback )
        return () => window.removeEventListener( "storage", storageCallback )
    }

    notify( key: string, value: V | undefined ) {
        this.watchers.forEachIn( key, callback => callback( value ) )
        if ( this.keysWatchers.size > 0 ) {
            const keys = this.keys()
            this.keysWatchers.forEach( callback => callback( keys ) )
        }
    }

    serialize( value: any ): string { return JSON.stringify( value ) }
    deserialize( value: string | null ): V | undefined {
        return value === null ? undefined : JSON.parse( value )
    }

    storageKey( key: string ): string { return this.prefix + "." + key }
    extractKey( storageKey: string ): string { return storageKey.substring( this.prefix.length + 1 ) }

    get( key: string ): V | undefined {
        console.log( "LocalStore.get", key )
        return this.deserialize( localStorage.getItem( this.storageKey( key ) ) )
    }

    set( key: string, value: V | undefined ): void {
        console.log( "LocalStore.set", key, value )
        if ( value === undefined )
            localStorage.removeItem( this.storageKey( key ) )
        else
            localStorage.setItem( this.storageKey( key ), this.serialize( value ) )
        this.notify( key, value )
    }

    watch( key: string, callback: ( value: V | undefined ) => void ): Unwatcher {
        this.watchers.add( key, callback )
        return () => this.watchers.delete( key, callback )
    }

    watchKeys( callback: ( keys: string[] ) => void ): Unwatcher {
        this.keysWatchers.add( callback )
        return () => this.keysWatchers.delete( callback )
    }

    keys(): string[] {
        const keys: string[] = []
        for ( let i = 0; i < localStorage.length; i++ ) {
            const storageKey = localStorage.key( i )!
            if ( storageKey.startsWith( this.prefix ) )
                keys.push( this.extractKey( storageKey ) )
        }
        return keys
    }

}