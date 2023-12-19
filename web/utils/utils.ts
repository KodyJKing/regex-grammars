export function parseFunction( source: string ): Function | undefined {
    const factory = new Function( `return ${ source }` )
    const result = factory()
    if ( !( result instanceof Function ) )
        return undefined
    return result
}

// A proper modulus function that works with negative numbers
export function modulus( a: number, b: number ): number {
    return ( ( a % b ) + b ) % b
}