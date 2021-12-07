export type InstanceParameters = { [name in string]?: number }
export type InstanceAttributes = { [name in string]?: Attribute }

export type Instance<T> = {
    id: string
    value: T
    parameters: InstanceParameters
    attributes: InstanceAttributes
    symbol: symbol
}

export type Rule<T> = (instance: Instance<T>) => Array<Instance<T>>

export type Attribute = (NumberAttribute | EnumAttribute) & {
    generateRandomValue: () => number
}

export type NumberAttribute = {
    type: AttributeType.Float | AttributeType.Int
    min: number
    max: number
}

export type EnumAttribute = {
    type: AttributeType.Enum
    enums: Array<{ value: number; name: string }>
}

export enum AttributeType {
    Float,
    Enum,
    Int,
}

export type Rules<T> = {
    [symbol: symbol]: Rule<T>
}

export function getParameter(instance: Instance<unknown>, name: string, def: number): number {
    const split = instance.id.split("/")
    for (let i = 0; i < split.length + 1; i++) {
        const path = [...split.slice(0, i), name].join("/")
        const value = instance.parameters[path]
        if (value != null) {
            return value
        }
    }
    return def
}

export function CreateInstance<T>(
    parent: Instance<T> | undefined,
    id: string,
    symbol: symbol,
    value: T,
    newAttributes: InstanceAttributes = {},
    newParameters: InstanceParameters = {}
): Instance<T> {
    return {
        id: parent != null ? `${parent.id}/${id}` : id,
        attributes: { ...parent?.attributes, ...newAttributes },
        parameters: {
            ...newParameters,
            ...parent?.parameters,
        },
        value,
        symbol,
    }
}

export function reduce<T>(instance: Instance<T>, rules: Rules<T>): Array<Instance<T>> {
    const rule = rules[instance.symbol]
    if (rule == null) {
        return [instance]
    } else {
        return rule(instance)
            .map((instances) => reduce(instances, rules))
            .reduce((v1, v2) => v1.concat(v2), [])
    }
}
