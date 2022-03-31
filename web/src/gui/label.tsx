import { HTMLProps } from "react"

export function StartLabel({ className, value, children, ...rest }: { value: string } & HTMLProps<HTMLDivElement>) {
    return (
        <div className={`${className} d-flex flex-row align-items-center`} {...rest}>
            <label style={{ width: "4rem" }} className="mb-0 flex-shrink-0 form-label me-2">
                {value}
            </label>
            {children}
        </div>
    )
}

export function EndLabel({ className, value, children, ...rest }: { value: string } & HTMLProps<HTMLDivElement>) {
    return (
        <div className={`${className} d-flex flex-row align-items-center`} {...rest}>
            {children}
            <label className="mb-0 flex-shrink-0 form-label ms-2">{value}</label>
        </div>
    )
}
