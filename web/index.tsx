import React, { useState } from "react"
import { createRoot } from "react-dom/client"
import { Editor } from "./components/Editor.js"
import { undent } from "../src/utils/stringUtils.js"
import { SplitPane } from "./components/SplitPane.js"

window.addEventListener( "beforeunload", e => {
    e.preventDefault()
    e.returnValue = ""
} )

const root = createRoot( document.getElementById( "root" ) as HTMLElement )

// root.render( <div className="fill">
//     <SplitPane direction="long" minSize={.3} className="fill">
//         <Pane color="red"/>
//         <Pane color="green"/>
//         <Pane color="blue"/>
//     </SplitPane>
// </div> )
// function Pane({color}) {
//     return <div className="fill" style={{backgroundColor: color, position: "relative" }}>
//         <div style={{ position: "absolute", backgroundColor: "black", top: 0, left: 0 }}>UL</div>
//         <div style={{ position: "absolute", backgroundColor: "gray", top: 0, right: 0 }}>UR</div>
//         <div style={{ position: "absolute", backgroundColor: "black", bottom: 0, left: 0 }}>BL</div>
//         <div style={{ position: "absolute", backgroundColor: "gray", bottom: 0, right: 0 }}>BR</div>

//         Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam odio velit, suscipit sit amet massa sed, pellentesque eleifend massa. In congue nisl quis ligula tempor, sit amet luctus metus varius. Nam fermentum erat nec tortor finibus feugiat ac eget nisl. Cras sed erat vel libero commodo lacinia a a nulla. Donec scelerisque at nisi tincidunt imperdiet. Integer nibh lectus, volutpat a placerat ultricies, vestibulum vel ante. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Donec fermentum tortor a blandit vestibulum. Donec interdum sed nibh at ornare.

//         Nulla elit libero, consequat in arcu eget, vestibulum tincidunt diam. Integer quis turpis tempus, tincidunt tellus a, sagittis dui. Ut sed aliquet nibh, vel semper purus. Nulla a interdum erat. Integer magna mi, venenatis vel metus quis, pulvinar placerat odio. Nulla lorem eros, porttitor eu velit eget, ullamcorper faucibus nisi. Nam posuere libero lorem, ut elementum neque imperdiet quis. Sed metus neque, fermentum quis purus eget, tincidunt venenatis ex. Integer ornare nunc dictum imperdiet aliquet. Suspendisse malesuada lacus odio, pellentesque consequat nisi laoreet id. Interdum et malesuada fames ac ante ipsum primis in faucibus. Nunc quis lorem quis velit vestibulum varius non sit amet dui. Aliquam mattis arcu id massa sodales, et vestibulum mi vulputate. Aliquam in ipsum sagittis, venenatis sem at, tincidunt elit. In pellentesque ornare arcu a pulvinar. Maecenas lacinia arcu in convallis interdum.

//         {/* Proin ante mauris, venenatis eu nisi quis, luctus sodales sapien. Pellentesque nec sapien posuere, venenatis nisl eget, sodales enim. Praesent vehicula risus augue, facilisis euismod augue efficitur fringilla. Ut nibh sapien, semper at hendrerit non, tristique ut orci. Sed ut fermentum sem. Phasellus lobortis ullamcorper mi ut dictum. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Donec sed sapien ut nibh iaculis tincidunt in non dolor. Sed tempus iaculis maximus. Nam aliquam mi ut mattis gravida. Sed vel leo urna. Quisque eleifend finibus sagittis.

//         Mauris tortor felis, euismod nec elit eu, semper rutrum odio. Quisque a lobortis felis. Nam condimentum tellus dolor, placerat sollicitudin magna commodo ac. Sed ut varius sem. Ut efficitur sem eget mollis bibendum. Phasellus id sem varius, elementum nisl vel, egestas magna. Proin ornare risus id orci pulvinar, sed volutpat ante luctus. Vestibulum luctus dapibus porta.

//         Suspendisse posuere aliquam erat ut dignissim. Pellentesque felis sapien, porta in vehicula vel, consequat vitae magna. Sed gravida velit ac quam interdum, quis consectetur lacus hendrerit. Nunc mollis purus eget felis porttitor lobortis. Ut pellentesque scelerisque diam sit amet scelerisque. Etiam placerat tempor dui a interdum. Nam nec nulla sodales, congue leo vehicula, tincidunt justo. Sed quis nunc dapibus, scelerisque metus et, varius leo. Proin mattis, felis id imperdiet iaculis, nisi odio fringilla massa, nec porta tellus ex sit amet mi. Integer vitae odio a nulla laoreet commodo nec vel leo. Ut tristique quam sit amet felis suscipit consequat. Etiam non volutpat nisl. Sed interdum erat molestie blandit viverra. Vestibulum varius est sit amet porttitor laoreet. Phasellus scelerisque lectus nec augue viverra molestie. */}

//     </div>
// }

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