export default function debounce<F extends Function>( millis: number, func: F ): F {
    let timeout: number | null = null
    return ( ( ...args ) => {
        if ( timeout )
            clearTimeout( timeout )
        setTimeout( () => {
            timeout = null
            func( ...args )
        }, millis )
    } ) as unknown as F
}