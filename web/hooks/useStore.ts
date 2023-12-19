import { Store } from "../store/Store.js"
import { useState, useEffect } from "react"

export function useStore<K, V>( store: Store<K, V>, key: K ): V | undefined {
    const [ value, setValue ] = useState<V | undefined>( store.get( key ) )
    useEffect( () => store.watch( key, setValue ), [ store, key ] )
    return value
}

export function useStoreKeys<K, V>( store: Store<K, V> ): K[] {
    const [ keys, setKeys ] = useState<K[]>( store.keys() )
    useEffect( () => store.watchKeys( setKeys ), [ store ] )
    return keys
}
