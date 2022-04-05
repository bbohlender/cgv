import { useEffect } from "react"
import { TextEditor, Grammar } from "./tui"
import { GUI } from "./gui"
import { useBaseStore } from "./global"
import { useBaseGlobal } from "./global"
import { Dialogs } from "./gui/dialogs"

export function Editor() {
    const store = useBaseStore()
    useEffect(() => {
        const listener = (e: KeyboardEvent) => {
            switch (e.key) {
                case "Escape":
                    store.getState().escape()
                    break
                case "Delete":
                    if (e.target == document.body) {
                        store.getState().remove()
                    }
                    break
            }
        }
        window.addEventListener("keydown", listener)
        return () => window.removeEventListener("keydown", listener)
    }, [store])

    const { Viewer } = useBaseGlobal()

    return (
        <div className="d-flex responsive-flex-direction overflow-hidden position-absolute" style={{ inset: 0 }}>
            <Dialogs />
            <Viewer
                style={{ whiteSpace: "pre-line", top: 0, left: 0, right: 0, bottom: 0, position: "absolute" }}
                className="flex-basis-0 flex-grow-1 bg-white">
                <GUI
                    className="bg-light position-absolute border rounded shadow w-100"
                    style={{ top: "1rem", right: "1rem", maxWidth: "16rem" }}
                />
            </Viewer>
            <Grammar
                style={{ overflowX: "hidden", overflowY: "auto" }}
                className="text-editor p-3 text-light flex-basis-0 flex-grow-1 bg-dark position-relative"
            />
            <TextEditor
                style={{ overflowX: "hidden", overflowY: "auto" }}
                className="text-editor p-3 text-light flex-basis-0 flex-grow-1 bg-dark position-relative"
            />
        </div>
    )
}
