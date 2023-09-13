import { Color, colors, resetColor } from "./consoleColors.js"

type ColorMap = Record<string, Color>

export function prettyStringify(
    obj: any,
    options: {
        indentString?: string,
        maxLineWidth?: number,
        replacer?: ( value ) => any,
        colorize?: ( value ) => ColorMap
    }
) {
    let {
        indentString = "  ",
        maxLineWidth = 60,
        replacer,
        colorize
    } = options

    let builder = new IndentStringBuilder( indentString )
    visit( obj )
    return builder.content

    function visit( obj ) {
        if ( replacer )
            obj = replacer( obj )

        let inline = prettyStringifyInline( obj, { replacer, colorize } )
        if ( isPrimative( obj ) || inline.length <= maxLineWidth ) {
            builder.write( inline )
        } else if ( obj instanceof Array ) {
            builder.write( "[]" )
            builder.indent( () => {
                for ( let elem of obj ) {
                    builder.newLine()
                    visit( elem )
                }
            } )
        } else {
            builder.write( "{}" )
            builder.indent( () => {
                const colorMap: ColorMap = colorize ? colorize( obj ) : {}
                for ( let [ key, value ] of Object.entries( obj ) ) {
                    builder.newLine()
                    builder.write( key + ": " )
                    let colorName = colorMap[ key ]
                    if ( colorName ) builder.write( colors[ colorName ] )
                    visit( value )
                    if ( colorName ) builder.write( resetColor )
                }
            } )
        }
    }
}

export function prettyStringifyInline(
    obj: any,
    options: {
        replacer?: ( value ) => any,
        colorize?: ( value ) => ColorMap
    }
) {
    let {
        replacer,
        colorize
    } = options

    return stringify( obj )

    function stringify( obj ) {
        if ( replacer )
            obj = replacer( obj )

        if ( isPrimative( obj ) )
            return JSON.stringify( obj )

        if ( obj instanceof Array ) {
            if ( obj.length == 0 )
                return "[]"
            return `[ ${ obj.map( stringify ).join( ", " ) } ]`
        }

        let entries = Object.entries( obj )
        if ( entries.length == 0 )
            return "{}"
        const colorMap: ColorMap = colorize ? colorize( obj ) : {}
        let entriesString = entries.map(
            ( [ key, value ] ) => {
                let valueString = stringify( value )
                let colorName = colorMap[ key ]
                if ( colorName )
                    valueString = `${ colors[ colorName ] }${ valueString }${ resetColor }`
                return `${ key }: ${ valueString }`
            }
        ).join( ", " )
        return `{ ${ entriesString } }`
    }
}

function isPrimative( value ) {
    if ( value instanceof Object )
        return value === null
    return true
}

class IndentStringBuilder {

    content: string = ""
    indentLevel: number = 0

    constructor( public readonly indentString: string = "    " ) {
    }

    newLine() {
        this.content += "\n"
        for ( let i = 0; i < this.indentLevel; i++ )
            this.content += this.indentString
    }

    indent( then: () => void ) {
        this.indentLevel++
        then()
        this.indentLevel--
    }

    write( content: string ) {
        this.content += content
    }

}