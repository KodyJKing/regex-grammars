import test from "ava"
import { parse as _parse } from "../parser"
import { prettyStringify } from "../../utils/prettyStringify"
import { stringifyAST } from "../../utils/stringifyAST"
import { Grammar, grammarToRegexSource } from "../grammarToRegex"

const parse = _parse as ( source: string ) => Grammar

const DIVIDER = "\n\n"

const grammar = `
    // NegativeLookAhead = "Foo" !"l"
    // PositiveLookAhead = "Foo" &"l"

    // NegativeLookBehind = <! "s" "tool"
    // PositiveLookBehind = <& "s" "tool"

    // BackReference = @.\\1
    // NamedBackReference = foo: . \\k<foo>

    // LazyStringLiteral = '"' LazyAny '"'
    LazyList = "[" LazyAny|.., _ "," _ |? "]"
    LazyAny = .+? // Will match any character, but as few as possible.
    _ = \\s*

    // InputBoundary = ^"Hello World!"$

    // MDNRef = "[MDN Reference](https://developer.mozilla.org" ("/"  \\w+)+ ")"

    // Composition = name: \\w+ \\s birthday: DateLabeled \\s country: \\w+
    // DateLabeled = month: MM "/" day: DD "/" year: YYYY

    // DateList = Date| .., \\s* "," \\s* |

    // Date = MM "/" DD "/" YYYY
    // DD = [0-2][0-9]
    // MM = [0-1][0-9]
    // YYYY = \\d|4|

    // UnicodeCharClass = \\p{Sc}
    // Money = <& \\p{Sc} [0-9.]+

    // Newline = "\\n"
    
    // OptionalAfterLiteral = "Foo"?

    // DelimitedRepeat = "a"|..,","|?
`

function parseGrammarToRegexSource( source: string ) {
    return grammarToRegexSource( parse( source ) )
}

test( "main", t => {
    console.log( DIVIDER, grammar, DIVIDER )
    let ast = parse( grammar )
    console.log( DIVIDER, stringifyAST( ast ), DIVIDER )
    let regex = grammarToRegexSource( ast )
    console.log( DIVIDER, regex, DIVIDER )
    t.pass()
} )

test( "look-ahead", t => {
    let regexSource = parseGrammarToRegexSource( `start = "Foo" !"l"` )
    t.deepEqual( regexSource, "Foo(?!l)" )
} )

test( "mdn-ref", t => {
    let regexSource = parseGrammarToRegexSource(
        `start = "[MDN Reference](https://developer.mozilla.org" ("/" \\w+)+ ")" `
    )
    t.deepEqual( regexSource, /\[MDN Reference\]\(https:\/\/developer\.mozilla\.org(?:\/\w+)+\)/.source )
} )

test( "delimit", t => {
    let regexSource = parseGrammarToRegexSource( `start = "a"|..,","|` )
    t.deepEqual( regexSource, /(?:a(?:,a)*)?/.source )
} )