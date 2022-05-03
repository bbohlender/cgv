import { useEffect, useRef, useState } from "react"
import { TextEditor, Grammar, TUI } from "./tui"
import { GUI } from "./gui"
import { useBaseStore } from "./global"
import { useBaseGlobal } from "./global"
import { Dialogs } from "./gui/dialogs"
import { TextEditorToggle } from "./gui/toggles/text"
import { FullscreenToggle } from "./gui/toggles/fullscreen"
import { DescriptionList } from "./gui/description-list"
import Graph from "./graph"

export function Editor() {
    const store = useBaseStore()
    const rootRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const keyUpListener = (e: KeyboardEvent) => {
            switch (e.key) {
                case "Shift":
                    store.getState().setShift(false)
                    break
                case "Control":
                    store.getState().setControl(false)
                    break
            }
        }
        const keyDownListener = (e: KeyboardEvent) => {
            switch (e.key) {
                case "Escape":
                    store.getState().escape()
                    break
                case "Delete":
                    if (e.target == document.body) {
                        store.getState().removeStep()
                    }
                    break
                case "Shift":
                    store.getState().setShift(true)
                    break
                case "Control":
                    store.getState().setControl(true)
                    break
            }
        }
        window.addEventListener("keydown", keyDownListener)
        window.addEventListener("keyup", keyUpListener)
        return () => {
            window.removeEventListener("keydown", keyDownListener)
            window.removeEventListener("keyup", keyUpListener)
        }
    }, [store])

    const { Viewer } = useBaseGlobal()

    return (
        <div
            ref={rootRef}
            className="d-flex responsive-flex-direction overflow-hidden position-absolute"
            style={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <Dialogs />
            <Viewer
                style={{ whiteSpace: "pre-line", top: 0, left: 0, right: 0, bottom: 0 }}
                className="flex-basis-0 flex-grow-1 bg-white">
                <GUI
                    className="bg-light position-absolute border rounded shadow w-100"
                    style={{ top: "1rem", right: "1rem", maxWidth: "16rem" }}
                />
                <div style={{ bottom: "1rem", right: "1rem" }} className="d-flex flex-row position-absolute">
                    <TextEditorToggle className="me-2" />
                    <FullscreenToggle rootRef={rootRef} />
                </div>
                <DescriptionList className="position-absolute" style={{ top: "1rem", left: "1rem" }} />
            </Viewer>

            <div
                style={{ overflowX: "hidden", overflowY: "auto" }}
                className="text-editor text-light flex-basis-0 flex-grow-1 bg-dark position-relative">
                <TextEditor />
                <Grammar />
                <Graph />
            </div>
        </div>
    )
}
