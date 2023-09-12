import { Color, colors, resetColor } from "./consoleColors"

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

    function visit( obj ) {
        if ( replacer )
            obj = replacer( obj )

        // let json = JSON.stringify( obj )
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

    visit( obj )

    return builder.content
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

    let result = ""

    function visit( obj ) {
        if ( replacer )
            obj = replacer( obj )

        if ( isPrimative( obj ) ) {
            result += JSON.stringify( obj )
        } else if ( obj instanceof Array ) {
            if ( obj.length == 0 ) {
                result += "[]"
            } else {
                result += "["
                for ( let elem of obj ) {
                    result += " "
                    visit( elem )
                }
                result += " ]"
            }
        } else {
            let entries = Object.entries( obj )
            if ( entries.length == 0 ) {
                result += "{}"
            } else {
                const colorMap: ColorMap = colorize ? colorize( obj ) : {}
                result += "{"
                for ( let i = 0; i < entries.length; i++ ) {
                    let [ key, value ] = entries[ i ]
                    result += " " + key + ": "
                    let colorName = colorMap[ key ]
                    if ( colorName ) result += colors[ colorName ]
                    visit( value )
                    if ( colorName ) result += resetColor
                    if ( i + 1 < entries.length )
                        result += ","
                }
                result += " }"
            }
        }
    }

    visit( obj )

    return result

}

function isPrimative( value ) {
    if ( value instanceof Object && value !== null )
        return false
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

    indent( content: () => void ) {
        this.indentLevel++
        content()
        this.indentLevel--
    }

    write( content: string ) {
        this.content += content
    }

}