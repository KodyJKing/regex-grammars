export function parseFunction( source: string ): Function | undefined {
    const factory = new Function( `return ${ source }` )
    const result = factory()
    if ( !( result instanceof Function ) )
        return undefined
    return result
}
