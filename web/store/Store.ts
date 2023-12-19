export type Unwatcher = () => void

type Entries<K, V> = [ K, V ][]

export interface Store<K, V> {
    get( key: K ): V | undefined
    set( key: K, value: V | undefined ): void
    watch( key: K, callback: ( value: V | undefined ) => void ): Unwatcher
    watchKeys( callback: ( keys: K[] ) => void ): Unwatcher
    keys(): K[]
}
