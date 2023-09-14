import test from "ava"
import { stringifyAST } from "../utils/stringifyAST.js"
import { grammarToRegexSource } from "../grammarToRegex.js"
import { parseGrammar, parseGrammarToRegexSource } from "../index.js"

const DIVIDER = "\n\n"

const grammar = `
    // NegativeLookAhead = "Foo" !"l"
    // PositiveLookAhead = "Foo" &"l"

    // NegativeLookBehind = <! "s" "tool"
    // PositiveLookBehind = <& "s" "tool"

    // BackReference = @.\\1
    // NamedBackReference = foo: . \\k<foo>

    // LazyStringLiteral = '"' LazyAny '"'
    // LazyList = "[" LazyAny|.., _ "," _ |? "]"
    // LazyAny = .+? // Will match any character, but as few as possible.
    // _ = \\s*

    // InputBoundary = ^"Hello World!"$

    MDNRef = "[MDN Reference](https://developer.mozilla.org" ("/"  \\w+)+ ")"

    // Composition = name: \\w+ \\s birthday: DateLabeled \\s country: \\w+
    // DateLabeled = month: MM "/" day: DD "/" year: YYYY
    // DD = [0-2][0-9]
    // MM = [0-1][0-9]
    // YYYY = \\d|4|

    // DateList = Date| .., \\s* "," \\s* |

    // Date = MM "/" DD "/" YYYY

    // UnicodeCharClass = \\p{Sc}
    // Money = <& \\p{Sc} [0-9.]+

    // Newline = "\\n"
    
    // OptionalAfterLiteral = "Foo"?

    // DelimitedRepeat = "a"|..4,","|?
    // DelimitedRepeat = ("a"|4|)?
`

test( "main", t => {
    let ast = parseGrammar( grammar )
    console.log( DIVIDER, stringifyAST( ast ), DIVIDER )
    let regex = grammarToRegexSource( ast )
    console.log( DIVIDER, regex, DIVIDER )
    t.pass()
} )

const testCases: [ string, string, RegExp ][]
    = [
        [ "look-ahead", `start = "Foo" !"l"`, /Foo(?!l)/ ],
        [ "delimit", `start = "a"|..,","|`, /(?:a(?:,a)*)?/ ],
        [
            "mdn-ref",
            `start = "[MDN Reference](https://developer.mozilla.org" ("/" \\w+)+ ")"`,
            /\[MDN Reference\]\(https:\/\/developer\.mozilla\.org(?:\/\w+)+\)/
        ],
    ]

for ( let [ name, source, expectedRegex ] of testCases ) {
    test( name, t => {
        let regexSource = parseGrammarToRegexSource( source )
        t.deepEqual( regexSource, expectedRegex.source )
    } )
}
