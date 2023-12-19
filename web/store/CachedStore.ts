import { Store } from "./Store.js";

// A write-through cache wrapper for another Store.
export class CachedStore<K, V> implements Store<K, V> {
    private readonly cache: Map<K, V> = new Map()

    constructor( private readonly externalStore: Store<K, V> ) {
        this.initCache()
    }

    initCache() {
        const keys = this.externalStore.keys()
        for ( const key of keys ) {
            const value = this.externalStore.get( key )
            if ( value !== undefined )
                this.cache.set( key, value )
        }
        return this.externalStore.watchKeys( keys => {
            for ( const key of keys ) {
                const value = this.externalStore.get( key )
                if ( value !== undefined )
                    this.cache.set( key, value )
            }
        } )
    }

    get( key: K ): V | undefined {
        const value = this.cache.get( key )
        if ( value !== undefined )
            return value
        return this.externalStore.get( key )
    }

    set( key: K, value: V | undefined ): void {
        if ( value === undefined )
            this.cache.delete( key )
        else
            this.cache.set( key, value )
        this.externalStore.set( key, value )
    }

    watch( key: K, callback: ( value: V | undefined ) => void ): () => void {
        return this.externalStore.watch( key, callback )
    }

    watchKeys( callback: ( keys: K[] ) => void ): () => void {
        return this.externalStore.watchKeys( callback )
    }

    keys(): K[] {
        return Array.from( this.cache.keys() )
    }
}