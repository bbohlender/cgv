export type Rule<T> = (instance: Instance<T>) => Array<Instance<T>>

export type Attribute = (NumberAttribute | EnumAttribute) & {
    generateRandomValue: () => number
}

export type NumberAttribute = {
    type: AttributeType.Float | AttributeType.Int
    min?: number
    max?: number
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

export type InstanceParameters = { [name in string]?: number }
export type InstanceAttributes = { [name in string]?: Attribute }

export class Instance<T> {
    constructor(
        public readonly id: string,
        public readonly symbol: symbol,
        public readonly value: T,
        public readonly attributes: InstanceAttributes,
        public readonly parameters: InstanceParameters
    ) {}

    static create<T>(
        parent: Instance<T> | undefined,
        id: string,
        symbol: symbol,
        value: T,
        newAttributes: InstanceAttributes = {},
        newParameters: InstanceParameters = {}
    ): Instance<T> {
        return new Instance(
            parent != null ? `${parent.id}/${id}` : id,
            symbol,
            value,
            { ...parent?.attributes, ...newAttributes },
            {
                ...newParameters,
                ...parent?.parameters,
            }
        )
    }

    derive(rules: Rules<T>): Array<Instance<T>> {
        const rule = rules[this.symbol]
        if (rule == null) {
            return [this]
        } else {
            return rule(this)
                .map((instance) => instance.derive(rules))
                .reduce((v1, v2) => v1.concat(v2), [])
        }
    }

    getParameter(name: string, def: number): number {
        const split = this.id.split("/")
        for (let i = 0; i < split.length + 1; i++) {
            const path = [...split.slice(0, i), name].join("/")
            const value = this.parameters[path]
            if (value != null) {
                return value
            }
        }
        return def
    }
}
