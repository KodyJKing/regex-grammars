import React, { useRef, useState, useEffect, useMemo } from 'react'
import * as monaco from "monaco-editor"
import { PegexLanguageName } from '../language/pegex.js'
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

const editorSettings: monaco.editor.IStandaloneEditorConstructionOptions = {
    theme: "vs-dark",
    automaticLayout: true,
    minimap: { enabled: false },
    overviewRulerBorder: false,
}

const editorStyle: React.CSSProperties = {
    flex: "1 1 200px", minWidth: "400px", minHeight: "200px"
}

export function Editor( props: { grammarSource, sampleText, replacementPattern } ) {
    const [ grammarSource, setGrammarSource ] = useState<string>( "" )
    const [ grammarTextEditor, setGrammarEditor ] = useState<EditorType>()
    const [ conversionOptions, setConversionOptions ] = useState( { noNonCaptureGroups: false } )

    const [ flags, setFlags ] = useState( "gm" )

    const [ error, setError ] = useState<any>()
    const [ regexSource, setRegexSource ] = useState<string>()

    const [ sampleTextEditor, setTextEditor ] = useState<EditorType>()
    const [ sampleText, setSampleText ] = useState( "" )

    const [ replacementTextEditor, setReplacementTextEditor ] = useState<EditorType>()
    const [ replacementPattern, setReplacementPattern ] = useState( props.replacementPattern )
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
                updateSearch( decorationsState, model, regexSource, flags )
        }
    }, [ regexSource, sampleText, flags ] )

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
                const regex = new RegExp( regexSource, flags )
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
    }, [ regexSource, sampleText, replacementPattern, jsReplacer, flags ] )

    return <div ref={ref} className="fill flex-column">

        <OutputBar {...{ error, regexSource, flags }} />

        <div className="flex-long-axis" style={{ flex: "1 1 auto", gap: "1px 1px", maxHeight: "calc(100% - 40px)" }} >

            {/* Primary pane */}
            <div className="flex-column" style={{ flex: "1 1 200px", minWidth: "400px", minHeight: "200px" }}>

                <OptionsInput {...{
                    flags, setFlags,
                    conversionOptions,
                    setConversionOptions
                }} />

                {/* Grammar editor */}
                <MonacoEditor
                    style={editorStyle}
                    onEditor={setGrammarEditor}
                    onChanged={setGrammarSource}
                    options={{ value: props.grammarSource, language: PegexLanguageName, ...editorSettings }}
                />

            </div>

            {/* Secondary pane */}
            <Resizable flex
                style={{ alignSelf: "stretch", flex: "1", gap: "1px 1px" }}
                className="flex-short-axis"
                left={landscape} top={!landscape}
                minWidth={25} minHeight={25}
            >

                {/* Test input editor */}
                <MonacoEditor
                    style={editorStyle}
                    onChanged={setSampleText}
                    onEditor={setTextEditor}
                    options={{
                        value: props.sampleText, renderWhitespace: "all",
                        language: "plaintext", ...editorSettings
                    }}
                />

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
                    {/* Replacement editor */}
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

function OutputBar( { error, regexSource, flags } ) {
    return <div
        className="flex-column align-center bg-gray-1 pad-m center-text"
        style={{
            flex: "0 0 40px", userSelect: error ? "initial" : "all", justifyContent: "center",
            color: error ? "var(--color-error)" : undefined
        }}
    >
        {error ?? `/${ regexSource }/${ flags }`}
    </div>
}

function OptionsInput( { flags, setFlags, conversionOptions, setConversionOptions } ) {
    return <div
        className="flex-row flex-center bg-gray-1 pad-m"
        style={{ margin: "1px 0px 0px 0px", gap: "4px", fontSize: "12px" }}
    >
        <label className="no-select">Flags:</label>
        <Input value={flags} setValue={setFlags} pattern={/^(?:([gmiyuvsd])(?!.*\1))*$/} />
        <CheckBox
            label="Always use capture groups"
            title="Replaces non-capture groups with capture groups to reduce size."
            value={conversionOptions.noNonCaptureGroups}
            setValue={value => setConversionOptions( oldOptions => {
                return { ...oldOptions, noNonCaptureGroups: value }
            } )}
        />
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
        if ( !model )
            return

        try {

            let source = model.getValue()
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

function updateSearch( state: DecorationsState, model: monaco.editor.ITextModel, regexSource: string | undefined, flags: string ) {
    if ( !regexSource ) {
        state.decorations = model.deltaDecorations( state.decorations, [] )
        return
    }

    const classNames = [ "highlighted-text-1", "highlighted-text-2" ]

    const modelText = model.getValue()
    const regex = new RegExp( regexSource, flags )
    const matches = regex.global
        ? Array.from( modelText.matchAll( regex ) )
        : [ modelText.match( regex ) ].filter( m => m ) as [ RegExpMatchArray ]

    state.decorations = model.deltaDecorations(
        state.decorations,
        matches.map( ( match, i ) => {
            return {
                range: matchRange( match ),
                options: {
                    inlineClassName: classNames[ i % 2 ],
                    hoverMessage: { value: getMatchTable( match ) }
                }
            }
        } )
    )

    function getMatchTable( match: RegExpMatchArray ) {
        let lines: string[] = []

        function line( key, value ) { lines.push( `| ${ escapeMarkdown( key ) } | \`${ escapeMarkdown( value ) }\` |` ) }
        function escapeMarkdown( str: string ) { return str.replaceAll( /[\[\]\{\}\(\)\<\>\|\#\+\-\.\!\`\*\_\\]/g, "\\$&" ) }

        for ( let i = 0; i < match.length; i++ )
            line( `$${ i === 0 ? "&" : i }`, match[ i ] )

        if ( match.groups )
            for ( let [ key, val ] of Object.entries( match.groups ) )
                line( `$<${ key }>`, val )

        return `|group|text|\n|:-|:-|\n${ lines.join( "\n" ) }`
    }

    function matchRange( match: RegExpMatchArray ) {
        const start = match.index ?? 0
        const end = start + match[ 0 ].length
        const startPos = model.getPositionAt( start )
        const endPos = model.getPositionAt( end )
        return new monaco.Range(
            startPos.lineNumber, startPos.column,
            endPos.lineNumber, endPos.column
        )
    }
}
