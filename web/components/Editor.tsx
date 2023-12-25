import React, { useRef, useState } from 'react'
import * as monaco from "monaco-editor"
import { PegexLanguageName } from '../language/pegex.js'
import { MonacoEditor } from './MonacoEditor.js'
import { Resizable } from './Resizable.js'
import { useIsLandscape } from '../hooks/useSize.js'
import { CheckBox } from './CheckBox.js'
import { Input } from './Input.js'
import { LoadDialog, SaveDialog } from './FileDialog.js'

import classes from "./Editor.module.css"
import { fileStore } from '../SaveFile.js'
import { useEditorState } from './Editor.state.js'


const editorSettings: monaco.editor.IStandaloneEditorConstructionOptions = {
    theme: "vs-dark",
    automaticLayout: true,
    minimap: { enabled: false },
    overviewRulerBorder: false,
}

const editorStyle: React.CSSProperties = {
    flex: "1 1 200px", minWidth: "400px", minHeight: "200px"
}

export function Editor() {

    const editorState = useEditorState()
    const {
        fileName, setFileName,
        grammarState, sampleTextState, relacementTextState,
        conversionOptions, setConversionOptions,
        flags, setFlags,
        error,
        regexSource,
        replacementPattern, setReplacementPattern,
        jsReplacer, setJsReplacer,
        getSaveFile, loadSaveFile,
    } = editorState

    const [ saveDialogOpen, setSaveDialogOpen ] = useState( false )
    const [ loadDialogOpen, setLoadDialogOpen ] = useState( false )

    const ref = useRef<HTMLDivElement>( null )
    const landscape = useIsLandscape( ref )

    return <div ref={ref} className="fill flex-column"
        onKeyDown={e => {
            if ( e.key === "s" && e.ctrlKey ) {
                setSaveDialogOpen( true )
                e.preventDefault()
            }
            if ( e.key === "o" && e.ctrlKey ) {
                setLoadDialogOpen( true )
                e.preventDefault()
            }
        }}
    >

        {saveDialogOpen && <SaveDialog
            initialName={fileName}
            getFileState={getSaveFile}
            onSaved={setFileName}
            store={fileStore}
            close={() => setSaveDialogOpen( false )}
        />}
        {loadDialogOpen && <LoadDialog
            onLoaded={setFileName}
            setFileState={loadSaveFile}
            store={fileStore}
            close={() => setLoadDialogOpen( false )}
        />}

        <MenuBar
            openSaveDialog={() => setSaveDialogOpen( true )}
            openLoadDialog={() => setLoadDialogOpen( true )}
            editorState={editorState}
        />

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
                    editorState={grammarState}
                    options={{ language: PegexLanguageName, ...editorSettings }}
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
                    editorState={sampleTextState}
                    options={{
                        renderWhitespace: "all",
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
                        editorState={relacementTextState}
                        options={{
                            readOnly: true, renderWhitespace: "all",
                            language: "plaintext", ...editorSettings
                        }}
                    />
                </Resizable>

            </Resizable>
        </div>

    </div>
}

function MenuBar( props: {
    openSaveDialog: () => void,
    openLoadDialog: () => void,
    editorState: ReturnType<typeof useEditorState>
} ) {
    const copyDisabled = props.editorState.jsReplacer
    const copyTooltip = copyDisabled ? "JS replacer functions cannot be shared." : "copy link to clipboard"

    return <div className={classes.MenuBar}>
        <button onClick={props.openSaveDialog}>Save</button>
        <button onClick={props.openLoadDialog}>Load</button>
        <button disabled={copyDisabled} title={copyTooltip} onClick={props.editorState.copySharableLink}>Share</button>
        <div className={classes.MenuBarTitle}>{props.editorState.fileName}</div>
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
