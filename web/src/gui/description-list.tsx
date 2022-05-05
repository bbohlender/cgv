import { HTMLProps } from "react"
import { useBaseStore } from "../global"
import { DeleteIcon } from "../icons/delete"
import { EyeSlashIcon } from "../icons/eye-slash"
import { PlusIcon } from "../icons/plus"

export function DescriptionList({ style, className, ...rest }: HTMLProps<HTMLDivElement>) {
    const store = useBaseStore()
    const descriptions = store((state) => state.descriptions)
    const selectedDescription = store((state) => state.selectedDescription)
    return (
        <div
            {...rest}
            style={{ ...style, maxWidth: 200 }}
            className={`${className} bg-white rounded shadow w-100 overflow-hidden border d-flex flex-column`}>
            <div className="mx-3 my-2 d-flex flex-row align-items-center">
                <span>Descriptions</span>
                <div className="flex-grow-1" />
                <button
                    onClick={() =>
                        store.getState().request("create-description", (name) => store.getState().addDescription(name))
                    }
                    className={`btn text-primary btn-sm`}>
                    <PlusIcon />
                </button>
            </div>
            <div className="d-flex flex-column">
                {descriptions.map((description, i) => (
                    <div
                        onClick={() => store.getState().selectDescription(description.name)}
                        key={description.name}
                        className={`pointer py-2 ps-3 pe-2 d-flex flex-row align-items-center border-top border-1 ${
                            selectedDescription === description.name ? "bg-primary text-light" : ""
                        }`}>
                        {description.name}
                        <div className="flex-grow-1" />
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                store.getState().deleteDescription(description.name)
                            }}
                            className={`btn text-danger btn-sm`}>
                            <DeleteIcon />
                        </button>
                        <button
                            style={{ color: "inherit" }}
                            onClick={(e) => {
                                e.stopPropagation()
                                store.getState().toggleDescriptionVisible(i)
                            }}
                            className={`btn btn-sm ${description.visible ? "" : "text-primary"}`}>
                            <EyeSlashIcon />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}
