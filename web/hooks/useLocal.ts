import { useEffect, useState } from "react"

export function useLocal<T>( key: string, initialValue: T, forget: boolean ): [ T, ( value: T ) => void ] {
    const [ value, setValue ] = useState<T>( () => {
        if ( forget )
            return initialValue

        const localValue = localStorage.getItem( key )
        try {
            return localValue ? JSON.parse( localValue ) : initialValue
        } catch ( e ) {
            console.log( `Error parsing local storage value for key ${ key } : ${ e } - using initial value` )
            return initialValue
        }
    } )

    useEffect( () => {
        localStorage.setItem( key, JSON.stringify( value ) )
    }, [ key, value ] )

    return [ value, setValue ]
}