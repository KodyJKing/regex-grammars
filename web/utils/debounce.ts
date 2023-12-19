export default function debounce<F extends Function>( millis: number, func: F ): F {
    let timeout: number | null = null
    return ( ( ...args ) => {
        if ( timeout !== null )
            clearTimeout( timeout )
        timeout = setTimeout( () => {
            timeout = null
            func( ...args )
        }, millis )
    } ) as unknown as F
}

export function debouncer( millis: number ) {
    const genericDebounce = debounce(
        millis,
        arg => arg()
    )
    return ( func: () => void ) => genericDebounce( func )
}