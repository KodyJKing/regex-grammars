import React, { useRef, useState, useEffect } from 'react'
import * as monaco from "monaco-editor"
// import styles from './Editor.module.css'
import { PegexLanguageName, registerPegexLanguage } from '../language/pegex.js'
import { undent } from '../../src/utils/stringUtils.js'
import { parseGrammar, parseGrammarToRegexSource } from '../../src/index.js'
import debounce from '../utils/debounce.js'

type IStandaloneCodeEditor = monaco.editor.IStandaloneCodeEditor

export function Editor() {
    const [ editor, setEditor ] = useState<IStandaloneCodeEditor | null>( null )
    const [ output, setOutput ] = useState<string>()
    const monacoEl = useRef( null )

    useEffect( () => {
        if ( monacoEl ) {
            setEditor( ( editor ) => {
                if ( editor ) {
                    return editor
                }

                registerPegexLanguage()

                const _editor = monaco.editor.create( monacoEl.current!, {
                    value: sampleSoure,
                    language: PegexLanguageName,
                    theme: "vs-dark",
                    automaticLayout: true
                } )

                _editor.onDidChangeModelContent( () => tryCompile( _editor, setOutput ) )
                tryCompile( _editor, setOutput )

                return _editor
            } )
        }

        return () => editor?.dispose()
    }, [ monacoEl.current ] )

    return <div className="fill flex-column">
        <div className="bar">{output}</div>
        <div className="fill" ref={monacoEl} />
    </div>
}

const tryCompile = debounce(
    100 /* milliseconds */,
    function tryCompile( editor: IStandaloneCodeEditor, setOutput: ( output: string ) => void ) {

        let model = editor.getModel()
        if ( !model ) return
        let source = model.getValue()

        try {
            // let ast = parseGrammar( source )
            let regexSource = parseGrammarToRegexSource( source )
            setOutput( `/${ regexSource }/` )
            monaco.editor.setModelMarkers( model, "owner", [] )
        } catch ( e ) {
            let message = e.toString()
            setOutput( message )
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

    //  Look Behind assertions
    NegativeLookBehind = <! "h" "ello"  // Only match "ello" if it is not preceded by "h".
    PositiveLookBehind = <& "h" "ello"  // Only match "ello" if it is preceded by "h".

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