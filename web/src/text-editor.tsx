import { KeyboardEvent, useState } from "react"
import { useStore } from "../pages/editor"

export function TextEditor() {
    const [text, setText] = useState("")
    return (
        <div className="flex-grow-1 d-flex position-relative">
            <textarea
                style={{ resize: "none", outline: 0, tabSize: 4 }}
                value={text}
                onKeyDown={(e) => onKeyDown(e, setText)}
                spellCheck={false}
                onChange={(e) => setText(e.target.value)}
                className="overflow-auto p-3 flex-basis-0 h3 mb-0 text-light border-0 bg-dark flex-grow-1"
            />

            <button
                className="btn btn-secondary"
                style={{ position: "absolute", right: "1rem", bottom: "1rem" }}
                onClick={() => {}}>
                Done
            </button>
        </div>
    )
}

function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>, setText: (text: string) => void) {
    if (e.code === "Tab") {
        e.preventDefault()
        // tab was pressed

        // get caret position/selection
        var val = e.currentTarget.value,
            start = e.currentTarget.selectionStart,
            end = e.currentTarget.selectionEnd

        // set textarea value to: text before caret + tab + text after caret
        setText(val.substring(0, start) + "\t" + val.substring(end))

        // put caret at right position again
        //e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 1

        // prevent the focus lose
        return false
    }
}
