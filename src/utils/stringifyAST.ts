import { prettyStringify } from "./prettyStringify.js"

export function stringifyAST( ast: any ) {
    return prettyStringify(
        ast,
        {
            indentString: "    ",
            maxLineWidth: 150,
            replacer: stripASTValue,
            colorize() { return { type: "green", name: "yellow", label: "red", value: "cyan" } }
        }
    )
}

function stripASTValue( value ) {
    // Check that this is an AST node
    if ( value?.type ) {
        let result = Object.assign( {}, value )
        delete result.location
        delete result.nameLocation
        delete result.labelLocation
        return result
    }
    return value
}
