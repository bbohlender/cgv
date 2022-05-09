import { useEffect, useRef } from "react"
import { TextEditor, Grammar } from "./tui"
import { GUI } from "./gui"
import { useBaseStore, useBaseStoreState } from "./global"
import { useBaseGlobal } from "./global"
import { Dialogs } from "./gui/dialogs"
import { TextEditorToggle } from "./gui/toggles/text"
import { FullscreenToggle } from "./gui/toggles/fullscreen"
import { DescriptionList } from "./gui/description-list"
import { Graph } from "./graph"

export function Editor() {
    const store = useBaseStore()
    useEffect(() => {
        const keyUpListener = (e: KeyboardEvent) => {
            switch (e.key) {
                case "Shift":
                    store.getState().setShift(false)
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
            className="d-flex responsive-flex-direction overflow-hidden position-absolute"
            style={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <Dialogs />
            <Viewer
                style={{ whiteSpace: "pre-line", top: 0, left: 0, right: 0, bottom: 0 }}
                className="flex-basis-0 flex-grow-1 bg-white"
            />

            <RightHandSide />
        </div>
    )
}

function RightHandSide() {
    const Component = useBaseStoreState((state) =>
        !state.showTui ? undefined : state.type === "tui" ? TextEditor : state.graphVisualization ? Graph : Grammar
    )

    if (Component == null) {
        return null
    }

    return (
        <div className="scroll text-editor text-light flex-basis-0 flex-grow-1 bg-dark d-flex">
            <Component />
        </div>
    )
}
