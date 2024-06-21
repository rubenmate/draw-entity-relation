import {repeatedEntities } from '../../src/utils/validation'

// TODO: Add a before all that imports and converts to Object
// the example json
test("entities can't have repeated names", () => {
    expect(repeatedEntities(graph)).toBe(false);
});
test("N:M relations and entities can't have repeated names", () => {
    // TODO: Access to the N:M relation and set its name to an already
    // existing entity name
    expect(repeatedEntities(graph)).toBe(true);
});
