import { useEffect } from "react"
import { TextEditor, Grammar } from "./tui"
import { GUI } from "./gui"
import { StepDescriptorDialog } from "./step-descriptor-dialog"
import { useStore } from "./global"
import { useGlobal } from "./global"

export function Editor() {
    const store = useStore()
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

    //TODO: show error

    const showDialog = store(({ stepDescriptorDialogFor }) => stepDescriptorDialogFor != null)
    const { Viewer } = useGlobal()

    return (
        <div className="d-flex responsive-flex-direction" style={{ width: "100vw", height: "100vh" }}>
            {showDialog && <StepDescriptorDialog onSelected={store.getState().onStepDescribed} />}
            <div className="flex-basis-0 flex-grow-1 position-relative">
                <Viewer
                    style={{ whiteSpace: "pre-line", top: 0, left: 0, right: 0, bottom: 0, position: "absolute" }}
                    className="flex-basis-0 flex-grow-1 bg-white"
                />
                <GUI
                    className="bg-light position-absolute border rounded shadow w-100"
                    style={{ top: "1rem", right: "1rem", maxWidth: "16rem" }}
                />
            </div>
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
