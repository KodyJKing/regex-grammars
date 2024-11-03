import { Store } from "./Store.js"

export class CompositeStore<K, V> implements Store<K, V> {

    constructor( private readonly stores: Store<K, V>[] ) {
    }

    writable( key: K ): boolean {
        return this.stores.some( store => store.writable( key ) )
    }

    has( key: K ): boolean {
        return this.stores.some( store => store.has( key ) )
    }

    get( key: K ): V | undefined {
        for ( const store of this.stores ) {
            if ( store.has( key ) )
                return store.get( key )
        }
        return undefined
    }

    set( key: K, value: V | undefined ): void {
        for ( const store of this.stores ) {
            if ( store.writable( key ) ) {
                store.set( key, value )
                return
            }
        }
        throw new Error( "No writable store for key " + key )
    }

    watch( key: K, callback: ( value: V | undefined ) => void ): () => void {
        const unwatchers = this.stores.map( store => store.watch( key, callback ) )
        return () => unwatchers.forEach( unwatcher => unwatcher() )
    }

    watchKeys( callback: ( keys: K[] ) => void ): () => void {
        function onKeyChange() {
            // We can't use the keys provided by the callbacks because we need to agregate keys from all stores.
            callback( this.keys() )
        }
        const unwatchers = this.stores.map( store => store.watchKeys( onKeyChange ) )
        return () => unwatchers.forEach( unwatcher => unwatcher() )
    }

    keys(): K[] {
        const keys = new Set<K>()
        for ( const store of this.stores ) {
            for ( const key of store.keys() )
                keys.add( key )
        }
        return Array.from( keys )
    }

}