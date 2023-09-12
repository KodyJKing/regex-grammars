export function prettyStringify(
    obj: any,
    options: {
        indentString?: string,
        maxLineWidth?: number
    }
) {
    let { indentString = "  ", maxLineWidth = 40 } = options

    let builder = new IndentStringBuilder( indentString )

    function visit( obj ) {
        let json = JSON.stringify( obj )
        if ( isPrimative( obj ) || json.length <= maxLineWidth ) {
            builder.write( json )
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
                for ( let [ key, value ] of Object.entries( obj ) ) {
                    builder.newLine()
                    builder.write( key + ": " )
                    visit( value )
                }
            } )
        }
    }

    visit( obj )

    return builder.content
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