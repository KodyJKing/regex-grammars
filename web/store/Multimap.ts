export class Multimap<K, V> {
    private readonly map = new Map<K, Set<V>>()

    add( key: K, value: V ) {
        let values = this.map.get( key )
        if ( !values ) {
            values = new Set()
            this.map.set( key, values )
        }
        values.add( value )
    }

    delete( key: K, value: V ) {
        const values = this.map.get( key )
        if ( values ) {
            values.delete( value )
            if ( values.size === 0 )
                this.map.delete( key )
        }
    }

    get( key: K ) {
        return this.map.get( key )
    }

    has( key: K ) {
        return this.map.has( key )
    }

    *entries() {
        for ( const [ key, values ] of this.map.entries() ) {
            for ( const value of values ) {
                yield [ key, value ]
            }
        }
    }

    *keys() {
        yield* this.map.keys()
    }

    *values() {
        for ( const [ key, values ] of this.map.entries() ) {
            for ( const value of values ) {
                yield value
            }
        }
    }

    [ Symbol.iterator ]() {
        return this.entries()
    }

    forEachIn( key: K, callback: ( value: V ) => void ) {
        const values = this.map.get( key )
        if ( values )
            for ( const value of values )
                callback( value )
    }

    get size() {
        return this.map.size
    }

    clear() {
        this.map.clear()
    }
}