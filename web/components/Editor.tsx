import React, { useRef, useState, useEffect, useMemo } from 'react'
import * as monaco from "monaco-editor"
// import styles from './Editor.module.css'
import { PegexLanguageName } from '../language/pegex.js'
import { undent } from '../../src/utils/stringUtils.js'
import { parseGrammar, parseGrammarToRegexSource } from '../../src/index.js'
import debounce from '../utils/debounce.js'
import { EditorType, MonacoEditor } from './MonacoEditor.js'
import { ResizableContainer } from './ResizableContainer.js'
import { useSize } from '../hooks/useSize.js'

type DecorationsState = { decorations: string[] }

const editorSettings = {
    theme: "vs-dark",
    automaticLayout: true,
    minimap: { enabled: false }
}

export function Editor() {
    const [ output, setOutput ] = useState<string>()
    const [ regexSource, setRegexSource ] = useState<string>()
    const [ sampleTextEditor, setTextEditor ] = useState<EditorType>()
    const [ sampleText, setSampleText ] = useState( "" )

    const decorationsState = useMemo<DecorationsState>( () => { return { decorations: [] } }, [] )

    const ref = useRef<HTMLDivElement>( null )
    const [ width, height ] = useSize( ref )
    const landscape = width > height

    useEffect( () => {
        if ( sampleTextEditor ) {
            const model = sampleTextEditor.getModel()
            if ( model )
                search( decorationsState, model, regexSource )
        }
    }, [ regexSource, sampleText ] )

    return <div ref={ref} className="fill flex-column">
        <div className="output-bar" style={{ flex: "0 0 40px" }}>
            {output}
        </div>
        <div
            className="flex-long-axis"
            style={{ flex: "1 1 auto", gap: "1px 1px" }}
        >
            <MonacoEditor
                style={{ flex: "1 1 200px", minWidth: "400px", minHeight: "200px" }}
                options={{ value: sampleSoure, language: PegexLanguageName, ...editorSettings }}
                onChanged={( value, editor ) => compileDebounced( editor, setOutput, setRegexSource )}
            />
            <ResizableContainer flex
                style={{ alignSelf: "stretch", flex: "1" }}
                left={landscape} top={!landscape}
            >
                <MonacoEditor
                    className="fill"
                    options={{ value: initialSampleText, language: "plaintext", ...editorSettings }}
                    onChanged={setSampleText}
                    onEditor={setTextEditor}
                />
            </ResizableContainer>
        </div>
    </div>
}

const compileDebounced = debounce(
    100 /* milliseconds */,
    function compile(
        editor: EditorType,
        setOutput: ( output: string ) => void,
        setRegexSource: ( regexSource: string | undefined ) => void
    ) {

        let model = editor.getModel()
        if ( !model ) return
        let source = model.getValue()

        try {

            let regexSource = parseGrammarToRegexSource( source )
            setOutput( `/${ regexSource }/` )
            setRegexSource( regexSource )
            monaco.editor.setModelMarkers( model, "owner", [] )

        } catch ( e ) {

            let message = e.toString()

            setOutput( message )
            setRegexSource( undefined )

            let { location } = e
            if ( !location ) return
            let { start, end } = location

            monaco.editor.setModelMarkers( model, "owner", [ {
                severity: monaco.MarkerSeverity.Error,
                message: message,
                startColumn: start.column,
                startLineNumber: start.line,
                endColumn: end.column,
                endLineNumber: end.line,
            } ] )

        }

    }
)

function search( state: DecorationsState, model: monaco.editor.ITextModel, text?: string ) {
    if ( !text ) {
        state.decorations = model.deltaDecorations( state.decorations, [] )
        return
    }
    const classNames = [ "highlighted-text-1", "highlighted-text-2" ]
    const matches = model.findMatches( text, false, true, false, null, true )
    // console.log( matches )
    state.decorations = model.deltaDecorations(
        state.decorations,
        matches.map( ( match, i ) => {
            return {
                range: match.range,
                options: { inlineClassName: classNames[ i % 2 ] }
            }
        } )
    )
}

const initialSampleText = undent( `
    This is a valid date: 03/15/1980
    This is not: 23/15/1980
    This is a another valid date: 01/12/2005
`)

const sampleSoure = undent( `
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
    //  Additions / changes to Peggy grammar:
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
`)