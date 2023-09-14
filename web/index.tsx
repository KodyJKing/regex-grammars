import React from "react"
import ReactDOM from "react-dom"
import { createRoot } from "react-dom/client"
import { Editor } from "./components/Editor.js"

const root = createRoot( document.getElementById( "root" ) as HTMLElement )
root.render(
    <Editor></Editor>
)