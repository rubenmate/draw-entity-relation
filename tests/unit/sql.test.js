import { beforeEach, describe, expect, test } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { 
    filterTables,
} from "../../src/utils/sql"

let oneNGraph;
let oneOneGraph;
let nMGraph;
let oneNGraphAndEntity;

beforeEach(() => {
    // Load fresh data before each test
    const oneNGraphData = 
    readFileSync(resolve(__dirname, './graphs/1-n-relation.json'), 'utf-8');
    oneNGraph = JSON.parse(oneNGraphData);

    const oneOneGraphData = 
    readFileSync(resolve(__dirname, './graphs/1-1-relation.json'), 'utf-8');
    oneOneGraph = JSON.parse(oneOneGraphData);

    const nMGraphData = 
    readFileSync(resolve(__dirname, './graphs/n-m-relation.json'), 'utf-8');
    nMGraph = JSON.parse(nMGraphData);

    const oneNGraphAndEntityData = 
    readFileSync(resolve(__dirname, './graphs/1-n-relation_alone-entity.json'), 'utf-8');
    oneNGraphAndEntity = JSON.parse(oneNGraphAndEntityData);
});

describe("Filter graph tables", () => {
    test("1:1 relation", () => {
        const tables = filterTables(oneOneGraph)
        expect(tables.length).toBe(1)
        expect(tables.at(0).type).toBe("1:1")
    })
    test("1:N relation", () => {
        const tables = filterTables(oneNGraph)
        expect(tables.length).toBe(1)
        expect(tables.at(0).type).toBe("1:N")
    })
    test("N:M relation", () => {
        const tables = filterTables(nMGraph)
        expect(tables.length).toBe(1)
        expect(tables.at(0).type).toBe("N:M")
    })
    test("1:N relation and unconnected entity", () => {
        const tables = filterTables(oneNGraphAndEntity)
        expect(tables.length).toBe(2)
        expect(tables.at(0).type).toBe("1:N")
        expect(tables.at(0).name).toBe("Relación")
        expect(tables.at(1).name).toBe("Entidad")
    })
})
