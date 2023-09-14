export function hex( ch: any ) { return ch.charCodeAt( 0 ).toString( 16 ).toUpperCase() }
export function escapeRegExp( str: string ) { return escapeString( str ).replace( /[\-\[\]\/\{\}\(\)\*\+\?\.\^\$\|]/g, "\\$&" ) }
export function escapeString( s: any ) {
    return s
        .replace( /\\/g, '\\\\' )   // backslash
        // .replace( /"/g, '\\"' )     // closing double quote
        .replace( /\0/g, '\\0' )    // null
        .replace( /\x08/g, '\\b' )  // backspace
        .replace( /\t/g, '\\t' )    // horizontal tab
        .replace( /\n/g, '\\n' )    // line feed
        .replace( /\f/g, '\\f' )    // form feed
        .replace( /\r/g, '\\r' )    // carriage return
        .replace( /[\x00-\x0F]/g, function ( ch: any ) { return '\\x0' + hex( ch ) } )
        .replace( /[\x10-\x1F\x7F-\xFF]/g, function ( ch: any ) { return '\\x' + hex( ch ) } )
        .replace( /[\u0100-\u0FFF]/g, function ( ch: any ) { return '\\u0' + hex( ch ) } )
        .replace( /[\u1000-\uFFFF]/g, function ( ch: any ) { return '\\u' + hex( ch ) } )
}

/** 
 * Removes any common indentation between lines so atleast one line has no indent. 
 * Removes trailing/leading empty lines.
 * Useful for cleaner multi-line strings 
 */
export function undent( content: string ) {
    let lines = content.split( "\n" )

    let last = lines[ lines.length - 1 ]
    let first = lines[ 0 ]
    if ( last.trim().length == 0 ) lines.pop()
    if ( first.trim().length == 0 ) lines.shift()

    // lines = lines.slice( 1, lines.length - 1 )

    let lineStarts = lines.map( line => line.search( /[^ ]/g ) ).filter( x => x > -1 )
    let minStart = Math.min( ...lineStarts )
    return lines.map( line => line.slice( minStart ) ).join( "\n" )
}