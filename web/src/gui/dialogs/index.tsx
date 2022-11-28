import { useBaseStoreState } from "../../global"
import { CreateDescriptionDialog } from "./create-description"
import { CreateStepDialog } from "./create-step"
import { SelectionPatternDialog } from "./select-pattern"
import { SetNameDialog } from "./set-name"
import { SummarizeDialog } from "./summarize"

export function Dialogs() {
    const requested = useBaseStoreState((state) => (state.type === "gui" ? state.requested : undefined))
    if (requested == null) {
        return null
    }
    return (
        <div
            className="position-absolute d-flex flex-column align-items-center overflow-hidden"
            style={{ top: 0, right: 0, bottom: 0, left: 0, zIndex: 2, background: "rgba(0,0,0,0.3)" }}>
            <div
                style={{ maxWidth: "90vw", margin: "0 auto" }}
                className="rounded overflow-hidden shadow d-flex flex-column m-3 p-3 w-100 bg-light">
                {selectDialog(requested.data, requested.type, requested.fulfill)}
            </div>
        </div>
    )
}

function selectDialog(data: any, type: string, fulfill: (value: any) => void) {
    switch (type) {
        case "summarize":
            return <SummarizeDialog data={data} />
        case "create-step":
            return <CreateStepDialog data={data} fulfill={fulfill} />
        case "create-description":
            return <CreateDescriptionDialog data={data} fulfill={fulfill} />
        case "set-name":
            return <SetNameDialog fulfill={fulfill} />
        case "select-condition":
            return <SelectionPatternDialog data={data} fulfill={fulfill} />
    }
}
