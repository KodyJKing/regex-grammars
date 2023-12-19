import { Store } from "../store/Store.js"
import { useState, useEffect, useMemo } from "react"

type State<V> = ReturnType<typeof useState<V>>

export function useStore<K, V>( store: Store<K, V>, key: K, initialValue?: V ): State<V> {
    const _initialValue = useMemo( () => store.get( key ) ?? initialValue, [] )

    const [ value, setValue ] = useState<V | undefined>( _initialValue )

    useEffect( () => store.watch( key, setValue ), [ store, key ] )

    function _setValue( value: V | undefined ) {
        store.set( key, value )
    }

    return [ value, _setValue ]
}

export function useStoreKeys<K, V>( store: Store<K, V> ): K[] {
    const [ keys, setKeys ] = useState<K[]>( store.keys() )
    useEffect( () => store.watchKeys( setKeys ), [ store ] )
    return keys
}
