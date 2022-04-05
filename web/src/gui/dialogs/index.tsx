import { useBaseStoreState } from "../../global"
import { CreateNounDialog } from "./create-noun"
import { CreateStepDialog } from "./create-step"
import { SelectNounDialog } from "./select-noun"

export function Dialogs() {
    const requested = useBaseStoreState((state) => (state.type === "gui" ? state.requested : undefined))
    if (requested == null) {
        return null
    }
    return (
        <div
            className="position-absolute d-flex flex-column align-items-center overflow-hidden"
            style={{ inset: 0, zIndex: 2, background: "rgba(0,0,0,0.3)" }}>
            <div
                style={{ maxWidth: "40rem", margin: "0 auto" }}
                className="rounded overflow-hidden shadow d-flex flex-column m-3 p-3 w-100 bg-light">
                {selectDialog(requested.type, requested.fulfill)}
            </div>
        </div>
    )
}

function selectDialog(type: string, fullfill: (value: any) => void) {
    switch (type) {
        case "create-noun":
            return <CreateNounDialog fulfill={fullfill} />
        case "select-noun":
            return <SelectNounDialog fulfill={fullfill} />
        case "create-step":
            return <CreateStepDialog fulfill={fullfill} />
    }
}

export * from "./create-noun"
export * from "./create-step"
