import type { RefCallback } from "react";
import type { Draft } from "immer";
import type { ClipConfig, ObjectConfig } from "./config";

// Entry is the type that can be given to the 'orchestrate' function
export type FieldStore<Entry, Store> = {
  convert: (e: Entry) => Store;
  eq: (a: Store, b: Store) => boolean;
  interp: (a: Store, b: Store, alpha: number) => Store;
  set: (object: Draft<{ store: Store }>, value: Store) => void;
};

// Field Definitions
export type FieldDefinition<Entry, Store, Target> = {
  store: FieldStore<Entry, Store>;
  assign: (target: Target, value: Store, last?: Store) => void;
  config?: ClipConfig;
};

export type FieldsBase = { [K: string]: FieldDefinition<any, any, any> };

/**
 * Utility type used to get the apply function for a specific field (K)
 **/
type AssignFunctionForField<Fields extends FieldsBase, K extends keyof Fields> = Fields[K]["assign"];

/**
 * Utility type used to get the Type for the timeline function
 */
export type EntryForField<Fields extends FieldsBase, K extends keyof Fields> = Parameters<
  Fields[K]["store"]["convert"]
>[0];

/**
 * Utility type used to get the Store type of a specific field (K)
 **/
export type StoreFromFields<Fields extends FieldsBase, K extends keyof Fields> = Parameters<
  AssignFunctionForField<Fields, K>
>[1];

/**
 * Utility Type to the field target for an object (Obj) in the Scene (specified by Base)
 **/
export type TargetFromBase<
  Fields extends FieldsBase,
  Base extends StateBase<Fields>,
  Obj extends keyof Base
> = AssignFunctionForField<Fields, Extract<keyof Base[Obj], keyof Fields>> extends (i: infer I, ...other: any[]) => void
  ? I
  : never;

type ObjectBase<Fields extends FieldsBase> = { [F in keyof Fields]?: EntryForField<Fields, F> } & {
  config?: ObjectConfig;
};

/**
 * Typing for the definition of the Base scene
 *
 * This is generic over the specific Fields (which mostly should be `typeof defaultFields` from `./fields.ts`)
 **/
export type StateBase<Fields extends FieldsBase> = {
  [K: string]: ObjectBase<Fields>;
};

/**
 * Utility type to extract keys of a union
 **/
type Keys<T> = T extends { [key: string]: any } ? keyof T : never;

/**
 * Custom Base Guard, that verifies that the custom Base onlu uses known fields
 * otherwise a template string is returned of the form `[unknown-fields: ]` + (wrong keys)
 **/
export type BaseGuard<Fields extends FieldsBase, Base extends StateBase<Fields>> = Keys<Base[keyof Base]> extends
  | keyof Fields
  | "config"
  ? Base
  : `[unknown-fields]: ${Exclude<Keys<Base[keyof Base]>, keyof Fields | "config">}`;

// type GeneralizeTuple<T, Target> = T extends [Target, ...infer Tail] ? [Target, ...GeneralizeTuple<Tail, Target>] : T;

/**
 * This is a small HACK that makes LengthOrPercentage tuples work
 * when defining clips with the `orchestrate` function
 */
// export type CleanupKeyframeState<T> = GeneralizeTuple<T, LengthOrPercentage>;

// export type FieldKeyframeState<T> = T | { value: T; config: ClipConfig };

export type ObjectKeyframe<Fields extends FieldsBase, F extends keyof Fields> = {
  [K in F]?: EntryForField<Fields, K> | { value: EntryForField<Fields, K>; config: ClipConfig } | "inherit-state";
};

// type PickFields<Fields extends FieldsBase, Obj extends ObjectBase<Fields>> = Pick<Obj, keyof Fields>;

export type KeyframeDefinition<Fields extends FieldsBase, Base extends StateBase<Fields>> = {
  [O in keyof Base]: { [T: number]: ObjectKeyframe<Fields, Extract<keyof Base[O], keyof Fields>> };
};

/**
 * A clip represents a single transition sequence for a Field Store
 **/
export type Clip<Store = any> = {
  start: [number, Store];
  end: [number, Store];
  config: Required<ClipConfig>;
};

/**
 * The parsed keyframes, that are computed by the orchestrate function.
 **/
export type Keyframes<Fields extends FieldsBase, Base extends StateBase<Fields>> = {
  [O in keyof Base]: {
    clips: { [K in keyof Pick<Base[O], keyof Fields>]: Clip<StoreFromFields<Fields, K>>[] };
    fields: (keyof Base[O])[];
    config: ObjectConfig;
  };
};

export type Refs<Fields extends FieldsBase, Base extends StateBase<Fields>> = {
  [Obj in keyof Base]: (id?: string) => RefCallback<TargetFromBase<Fields, Base, Obj>>;
};

/**
 * The type for the register callback .This is a function, that for every object (Obj) in the scene returns a RefCallback
 * of the required TargetType (inferred through the `TargetFromBase` utility). If the object specifies multiple fields to
 * be modified, this will be the Intersection type of all fields
 **/
export type Register<Fields extends FieldsBase, Base extends StateBase<Fields>> = <Obj extends keyof Base>(
  obj: Obj,
  id?: string
) => RefCallback<TargetFromBase<Fields, Base, Obj>>;

// (progress: number) => void;

// Utility types

/**
 * This type returns all objects in `Base` which would be satisfied by type `Target`. This is a really helpful type
 * if you want to define reusable functionality for a scene object and only want the caller to be able to provide
 * object with a specific target type.
 *
 * For future reference this type is loosely inspired by:
 * https://stackoverflow.com/questions/60291002/can-typescript-restrict-keyof-to-a-list-of-properties-of-a-particular-type
 **/
export type ObjectsForTarget<Target, Fields extends FieldsBase, Base extends StateBase<Fields>> = {
  // for all keys in T
  [K in keyof Base]: Target extends TargetFromBase<Fields, Base, K> ? K : never; // if the value of this key is a string, keep it. Else, discard it
  // Get the union type of the remaining values.
}[keyof Base];
