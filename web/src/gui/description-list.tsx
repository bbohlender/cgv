import { HTMLProps } from "react"
import { useBaseStore } from "../global"
import { DeleteIcon } from "../icons/delete"
import { FileCheckIcon } from "../icons/file-check"
import { PlusIcon } from "../icons/plus"
import { RandomIcon } from "../icons/random"

export function DescriptionList({
    createDescriptionRequestData,
    style,
    className,
    children,
    ...rest
}: HTMLProps<HTMLDivElement> & { createDescriptionRequestData?: () => any }) {
    const store = useBaseStore()
    const descriptions = store((state) => state.descriptions)
    const selectedDescriptions = store((state) => state.selectedDescriptions)
    return (
        <div
            {...rest}
            style={style}
            className={`${className} bg-light rounded shadow w-100 overflow-hidden border d-flex flex-column`}>
            <div className="px-3 py-2 border-bottom d-flex flex-row align-items-center">
                <span>Descriptions</span>
                <div className="flex-grow-1" />
                <button
                    onClick={() =>
                        store
                            .getState()
                            .request(
                                "create-description",
                                (name) => store.getState().addDescriptions([{ name }]),
                                createDescriptionRequestData == null ? undefined : createDescriptionRequestData()
                            )
                    }
                    className={`btn text-primary btn-sm`}>
                    <PlusIcon />
                </button>
            </div>
            <div className="d-flex flex-column scroll">
                {descriptions.map(({ name, seed }, i) => (
                    <div
                        onClick={(e) => store.getState().selectDescription(name, e.shiftKey)}
                        key={name}
                        className={`pointer py-2 ps-3 pe-2 d-flex flex-row align-items-center border-top border-1 ${
                            selectedDescriptions.includes(name) ? "border-primary border-3 border" : ""
                        }`}>
                        <span className="overflow-hidden" style={{ textOverflow: "ellipsis" }}>
                            {name}
                        </span>
                        <div className="flex-grow-1" />
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                store.getState().concretizeDescription(name, seed)
                            }}
                            className={`btn btn-sm`}>
                            <FileCheckIcon />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                store.getState().setSeed(name, seed + 1)
                            }}
                            className={`btn btn-sm`}>
                            <RandomIcon />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                store.getState().deleteDescription(name)
                            }}
                            className={`btn text-danger btn-sm`}>
                            <DeleteIcon />
                        </button>
                    </div>
                ))}
            </div>
            {children}
        </div>
    )
}
