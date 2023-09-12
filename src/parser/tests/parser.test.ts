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

    // NegativeLookBehind = <!"s" "tool"
    // PositiveLookBehind = <&"s" "tool"

    // MDNRef = "[MDN Reference](https://developer.mozilla.org" ("/"  @Word)+ ")"
    // Word = WordChar+
    // WordChar = [a-zA-Z0-9_]

    Date = month: Digit|2| "/" day: Digit|2| "/" year: Digit|4|
    Digit = \\d

    // Newline = "\\n"
    
    // OptionalAfterLiteral = "Foo"?

    // DelimitedRepeat = "a"|..,","|
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
    let regexSource = parseGrammarToRegexSource( `
        MDNRef = "[MDN Reference](https://developer.mozilla.org" ("/" Word)+ ")"
        Word = WordChar+
        WordChar = [a-zA-Z0-9_]
    ` )
    t.deepEqual( regexSource, /\[MDN Reference\]\(https:\/\/developer\.mozilla\.org(?:\/[a-zA-Z0-9_]+)+\)/.source )
} )

test( "delimit", t => {
    let regexSource = parseGrammarToRegexSource( `start = "a"|..,","|` )
    t.deepEqual( regexSource, /(?:a(?:,a)*)?/.source )
} )