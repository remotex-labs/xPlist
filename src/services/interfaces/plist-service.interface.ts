export type PlistArrayType = Array<unknown>;
export type PlistObjectType = { [key: string]: unknown };

export type PlistObjectsType = PlistArrayType | PlistObjectType

export interface PlistNodeInterfaces {
    tag: string,
    content: PlistObjectsType,
}
