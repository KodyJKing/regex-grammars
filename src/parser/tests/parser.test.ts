import test from "ava"
import { parse } from "../parser"
import { prettyStringify } from "../../utils/prettyStringify"

const grammar = `
    start = "Foo"
`

test( "raw-parse", t => {
    let ast = parse( grammar )
    // console.log( JSON.stringify( ast, null, 2 ) )
    console.log( prettyStringify(
        ast, { indentString: "    " }
    ) )
    t.pass()
} )
