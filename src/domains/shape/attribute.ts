export type Attribute = (NumberAttribute | EnumAttribute) & {
    generateRandomValue: () => number;
  };
  
  export type NumberAttribute = {
    type: AttributeType.Float | AttributeType.Int;
    min: number;
    max: number;
  };
  
  export type EnumAttribute = {
    type: AttributeType.Enum;
    enums: Array<{ value: number; name: string }>;
  };
  
  export enum AttributeType {
    Float,
    Enum,
    Int,
  }