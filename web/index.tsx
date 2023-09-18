import React from "react"
import { createRoot } from "react-dom/client"
import { Editor } from "./components/Editor.js"

window.addEventListener( "beforeunload", e => {
    e.preventDefault()
    e.returnValue = ""
} )

const root = createRoot( document.getElementById( "root" ) as HTMLElement )
root.render(
    <Editor></Editor>
)