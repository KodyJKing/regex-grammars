import React, { useRef, useState, useEffect, useMemo } from 'react'
import * as monaco from "monaco-editor"
import { PegexLanguageName } from '../language/pegex.js'
import { undent } from '../../src/utils/stringUtils.js'
import { parseGrammarToRegexSource } from '../../src/index.js'
import debounce from '../utils/debounce.js'
import { EditorType, MonacoEditor } from './MonacoEditor.js'
import { Resizable } from './Resizable.js'
import { useIsLandscape } from '../hooks/useSize.js'
import { CheckBox } from './CheckBox.js'
import { ConversionOptions } from '../grammarToRegex.js'
import { Input } from './Input.js'
import { parseFunction } from '../utils/utils.js'

type DecorationsState = { decorations: string[] }

const editorSettings = {
    theme: "vs-dark",
    automaticLayout: true,
    minimap: { enabled: false }
}

const editorStyle: React.CSSProperties = {
    flex: "1 1 200px", minWidth: "400px", minHeight: "200px"
}

export function Editor() {
    const [ grammarSource, setGrammarSource ] = useState<string>( "" )
    const [ grammarTextEditor, setGrammarEditor ] = useState<EditorType>()
    const [ conversionOptions, setConversionOptions ] = useState( { noNonCaptureGroups: false } )

    // const [ flags, setFlags ] = useState( "gmu" )

    const [ error, setError ] = useState<any>()
    const [ regexSource, setRegexSource ] = useState<string>()

    const [ sampleTextEditor, setTextEditor ] = useState<EditorType>()
    const [ sampleText, setSampleText ] = useState( "" )

    const [ replacementTextEditor, setReplacementTextEditor ] = useState<EditorType>()
    const [ replacementPattern, setReplacementPattern ] = useState( `match => match.replaceAll("/", "-")` )
    const [ jsReplacer, setJsReplacer ] = useState( true )

    const decorationsState = useMemo<DecorationsState>( () => { return { decorations: [] } }, [] )

    const ref = useRef<HTMLDivElement>( null )
    const landscape = useIsLandscape( ref )

    // Compile grammar
    useEffect( () => {
        if ( grammarTextEditor )
            compileDebounced( grammarTextEditor, setError, setRegexSource, conversionOptions )
    }, [ grammarSource, conversionOptions ] )

    // Update text search
    useEffect( () => {
        if ( sampleTextEditor ) {
            const model = sampleTextEditor.getModel()
            if ( model )
                updateSearch( decorationsState, model, regexSource )
        }
    }, [ regexSource, sampleText ] )

    // Update text repacement
    useEffect( () => {
        if (
            replacementTextEditor && regexSource && sampleText &&
            replacementPattern !== undefined
        ) {
            const model = replacementTextEditor.getModel()
            if ( !model )
                return

            try {
                const regex = new RegExp( regexSource, "gmu" )
                const pattern = jsReplacer ? parseFunction( replacementPattern ) : replacementPattern
                if ( pattern !== undefined )
                    // @ts-ignore
                    replacementTextEditor.setValue( sampleText.replace( regex, pattern ) )
                else
                    replacementTextEditor.setValue( `Invalid ${ jsReplacer ? "function" : "pattern" }` )
            } catch ( e ) {
                replacementTextEditor.setValue( e.toString() )
            }
        }
    }, [ regexSource, sampleText, replacementPattern, jsReplacer ] )

    return <div ref={ref} className="fill flex-column">
        {/* Output bar */}
        <div
            className="flex-column align-center bg-gray-1 pad-m center-text"
            style={{
                flex: "0 0 40px", userSelect: error ? "initial" : "all", justifyContent: "center",
                color: error ? "var(--color-error)" : undefined
            }}
        >
            {error ?? `/${ regexSource }/gmu`}
        </div>

        <div className="flex-long-axis" style={{ flex: "1 1 auto", gap: "1px 1px", maxHeight: "calc(100% - 40px)" }} >
            {/* Primary pane */}
            <div className="flex-column" style={{ flex: "1 1 200px", minWidth: "400px", minHeight: "200px" }}>
                {/* Options */}
                <div
                    className="flex-row flex-center bg-gray-1 pad-m"
                    style={{ margin: "1px 0px", gap: "4px", fontSize: "12px" }}
                >
                    {/* <label className="no-select">Flags:</label>
                    <Input style={{ color: "red" }} value={flags} setValue={setFlags} /> */}
                    <CheckBox
                        label="Always use capture groups"
                        title="Replaces non-capture groups with capture groups to reduce size."
                        value={conversionOptions.noNonCaptureGroups}
                        setValue={value => setConversionOptions( oldOptions => {
                            return { ...oldOptions, noNonCaptureGroups: value }
                        } )}
                    />
                </div>

                {/* Main Editor */}
                <MonacoEditor
                    style={editorStyle}
                    onEditor={setGrammarEditor}
                    onChanged={setGrammarSource}
                    options={{ value: sampleSoure, language: PegexLanguageName, ...editorSettings }}
                />
            </div>

            {/* Secondary pane */}
            <Resizable flex
                style={{ alignSelf: "stretch", flex: "1", gap: "1px 1px" }}
                className="flex-short-axis"
                left={landscape} top={!landscape}
                minWidth={25} minHeight={25}
            >
                {/* Test input */}
                <MonacoEditor
                    style={editorStyle}
                    onChanged={setSampleText}
                    onEditor={setTextEditor}
                    options={{
                        value: initialSampleText, renderWhitespace: "all",
                        language: "plaintext", ...editorSettings
                    }}
                />

                {/* Replacement input/output */}
                <Resizable flex
                    className="flex-column bg-gray-2"
                    style={{ alignSelf: "stretch", flex: "1" }}
                    left={!landscape} top={landscape}
                    minWidth={25} minHeight={25}
                >
                    <PatternInput
                        patternState={[ replacementPattern, setReplacementPattern ]}
                        jsState={[ jsReplacer, setJsReplacer ]}
                    />
                    <MonacoEditor
                        style={editorStyle}
                        onEditor={setReplacementTextEditor}
                        options={{
                            value: "", readOnly: true, renderWhitespace: "all",
                            language: "plaintext", ...editorSettings
                        }}
                    />
                </Resizable>

            </Resizable>
        </div>

    </div>
}

function PatternInput( props: { patternState, jsState } ) {
    const {
        patternState: [ replacementPattern, setReplacementPattern ],
        jsState: [ jsReplacer, setJsReplacer ]
    } = props
    return <div className="flex-row flex-center bg-gray-1 pad-m" >
        <Input
            placeholder="replacement pattern or function"
            title="The pattern or function passed to String.replace(regex, patternOrFunction)"
            value={replacementPattern} setValue={setReplacementPattern}
        />
        <CheckBox
            label="JS" title="Interpret pattern as JS replacer function."
            value={jsReplacer} setValue={setJsReplacer}
        />
    </div>
}

const compileDebounced = debounce(
    50 /* milliseconds */,
    function compile(
        editor: EditorType,
        setError: ( output: any ) => void,
        setRegexSource: ( regexSource: string | undefined ) => void,
        conversionOptions: ConversionOptions
    ) {

        let model = editor.getModel()
        if ( !model ) return
        let source = model.getValue()

        try {

            let regexSource = parseGrammarToRegexSource( source, conversionOptions )
            setError( undefined )
            setRegexSource( regexSource )
            monaco.editor.setModelMarkers( model, "owner", [] )

        } catch ( e ) {

            let message = e.toString()

            setError( message )
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

function updateSearch( state: DecorationsState, model: monaco.editor.ITextModel, regexSource: string | undefined ) {
    if ( !regexSource ) {
        state.decorations = model.deltaDecorations( state.decorations, [] )
        return
    }
    const classNames = [ "highlighted-text-1", "highlighted-text-2" ]
    // Todo: Replace model.findMatches with custom code that supports any regex flags.
    const matches = model.findMatches( regexSource, false, true, true, null, true )
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
`)