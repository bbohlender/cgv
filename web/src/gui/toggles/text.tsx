import Tooltip from "rc-tooltip"
import { HTMLProps } from "react"
import { useBaseStore } from "../../global"
import { TextIcon } from "../../icons/text"

export function TextEditorToggle({ className, ...rest }: HTMLProps<HTMLDivElement>) {
    const store = useBaseStore()
    const showTui = store((state) => state.showTui)
    return (
        <Tooltip placement="left" overlay="Text Interface">
            <div
                {...rest}
                onClick={() => store.getState().setShowTui(!showTui)}
                className={`${className} d-flex align-items-center justify-content-center btn ${
                    showTui ? "btn-primary" : "btn-secondary"
                } btn-sm `}>
                <TextIcon />
            </div>
        </Tooltip>
    )
}
