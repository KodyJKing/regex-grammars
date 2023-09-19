import React from "react"
import { createRoot } from "react-dom/client"
import { Editor } from "./components/Editor.js"
import { undent } from "../src/utils/stringUtils.js"

window.addEventListener( "beforeunload", e => {
    e.preventDefault()
    e.returnValue = ""
} )

const root = createRoot( document.getElementById( "root" ) as HTMLElement )
root.render(
    <Editor
        sampleText={undent( `
            This is a valid date: 03/15/1980
            This is not: 23/15/1980
            This is a another valid date: 01/12/2005
        `)}
        replacementPattern={`match => match.replaceAll("/", "-")`}
        grammarSource={undent( `
                //
                //  Convert Peggy grammars into regexes.
                //  https://peggyjs.org/
                //

                Date
                    = month: MM "/" day: DD "/" year: YYYY
                DD
                    = [0-2][0-9]
                MM
                    = [0-1][0-9]
                YYYY
                    = \\d|4|
                
                //
                //  Additions and changes to Peggy grammar:
                //

                //  Built in regex classes
                BuiltInClasses 
                    = \\d / \\D / \\w / \\W / \\s / \\S 
                    / \\b / \\B // Word boundary assertions.

                //  Look behind assertions
                NegativeLookBehind = <! "h" "ello" // Only match "ello" if it is not preceded by "h".
                PositiveLookBehind = <& "h" "ello" // Only match "ello" if it is preceded by "h".

                //  Lazy quantifiers
                LazyZeroOrMore = \\w*? 
                LazyOneOrMore = \\w+?
                LazyOptional = \\w??

                //  Unicode character classes
                UnicodeCharClass = \\p{Sc}

                //  Back references
                BackReference = @.\\1
                NamedBackReference = foo: . \\k<foo>

                //  The symbol $ now means what it does in regex.
                InputBoundaryAssertions 
                    = ^ "Hello World" $            // Generates: /^Hello World$/

                //  Plucks transform to capture groups
                Tuple 
                    = @\\d+ "," @\\d+               // Generates: /(\d+),(\d+)/

                //  Labels transform to named capture groups.
                FullName
                    = first: \\w+ " " last: \\w+    // Generates: /(?<first>\w+) (?<last>\w+)/
                
                //  Repeated labels will generate an invalid regex because named captures must be unique.
                DateRange
                    = (month: MM "/" day: DD "/" year: YYYY Date) "-" 
                    (month: MM "/" day: DD "/" year: YYYY Date)

                //  Circular references are not allowed because regexes cannot support recursion.
                List 
                    = "[" Element|.., ", "| "]"
                Element
                    = Number / List
        `)}
    />
)