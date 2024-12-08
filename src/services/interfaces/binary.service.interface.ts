export interface OffsetsInterface {
    offset: number;
    offsetSize: number;
    numberOfObject: number;
}

export interface DecodeObjectRefInterface {
    map: Map<number, unknown>;
    offsetSize: number;
}

export interface EncodeObjectRefInterface {
    map: Map<unknown, number>;
    offset: number;
    offsetSize: number;
}
