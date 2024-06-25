import { beforeEach, describe, expect, test } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { 
    filterTables,
    process1NRelation,
    process11Relation,
    processNMRelation,
    generateNMSQL,
    generate1NSQL,
    generate11SQL,
    generateSQL
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
describe("Extract table 1:N relation", () => {
    test("1:N relation", () => {
        const filteredTables = filterTables(oneNGraph)
        const tables = process1NRelation(filteredTables.at(0))
        expect(tables.length).toBe(2)
        expect(tables.at(0).attributes.length).toBe(1)
        expect(tables.at(1).attributes.length).toBe(2)
        expect(tables.at(1).attributes.at(0).name).toBe("Atributo")
        expect(tables.at(1).attributes.at(1).name).toBe("Atributo_Entidad")
        expect(tables.at(1).attributes.at(1).notnull).toBe(false)
    })
    test("1:N relation with 1 side and min cardinality of 1", () => {
        oneNGraph.relations.at(0).side1.cardinality = "1:1"
        const filteredTables = filterTables(oneNGraph)
        const tables = process1NRelation(filteredTables.at(0))
        expect(tables.length).toBe(2)
        expect(tables.at(0).attributes.length).toBe(1)
        expect(tables.at(1).attributes.length).toBe(2)
        expect(tables.at(1).attributes.at(0).name).toBe("Atributo")
        expect(tables.at(1).attributes.at(1).name).toBe("Atributo_Entidad")
        expect(tables.at(1).attributes.at(1).notnull).toBe(true)
    })
})
describe("Extract table 1:1 relation", () => {
    test("1:1 relation, 1:1-1:1", () => {
        const filteredTables = filterTables(oneOneGraph)
        const tables = process11Relation(filteredTables.at(0))
        expect(tables.length).toBe(1)
        expect(tables.at(0).attributes.length).toBe(2)
        expect(tables.at(0).attributes.at(0).name).toBe("Atributo_Entidad")
        expect(tables.at(0).attributes.at(0).key).toBe(true)
        expect(tables.at(0).attributes.at(1).name).toBe("Atributo_Entidad 1")
        expect(tables.at(0).attributes.at(1).notnull).toBe(true)
        expect(tables.at(0).attributes.at(1).unique).toBe(true)
    })
    test("1:1 relation, 0:1-1:1", () => {
        oneOneGraph.relations.at(0).side1.cardinality = "0:1"
        const filteredTables = filterTables(oneOneGraph)
        const tables = process11Relation(filteredTables.at(0))
        expect(tables.length).toBe(2)
        expect(tables.at(0).attributes.length).toBe(1)
        expect(tables.at(1).attributes.length).toBe(2)
        expect(tables.at(0).attributes.at(0).name).toBe("Atributo")
        expect(tables.at(1).attributes.at(1).name).toBe("Atributo_Entidad 1")
        expect(tables.at(1).attributes.at(1).notnull).toBe(true)
        expect(tables.at(1).attributes.at(1).unique).toBe(true)
    })
    test("1:1 relation, 0:1-0:1", () => {
        oneOneGraph.relations.at(0).side1.cardinality = "0:1"
        oneOneGraph.relations.at(0).side2.cardinality = "0:1"
        const filteredTables = filterTables(oneOneGraph)
        const tables = process11Relation(filteredTables.at(0))
        expect(tables.length).toBe(2)
        expect(tables.at(0).attributes.length).toBe(1)
        expect(tables.at(1).attributes.length).toBe(2)
        expect(tables.at(0).attributes.at(0).name).toBe("Atributo")
        expect(tables.at(1).attributes.at(1).name).toBe("Atributo_Entidad 1")
        expect(tables.at(1).attributes.at(1).notnull).toBe(false)
        expect(tables.at(1).attributes.at(1).unique).toBe(true)
    })
})
describe("Extract table N:M relation", () => {
    test("N:M relation", () => {
        const filteredTables = filterTables(nMGraph)
        const tables = processNMRelation(filteredTables.at(0))
        expect(tables.length).toBe(3)
        expect(tables.at(0).attributes.length).toBe(1)
        expect(tables.at(1).attributes.length).toBe(1)
        expect(tables.at(2).attributes.length).toBe(3)

        expect(tables.at(2).attributes.at(0).name).toBe("Atributo_Entidad")
        expect(tables.at(2).attributes.at(0).key).toBe(true)
        expect(tables.at(2).attributes.at(0).foreign_key).toBe("Entidad")
        expect(tables.at(2).attributes.at(1).name).toBe("Atributo_Entidad 1")
        expect(tables.at(2).attributes.at(1).key).toBe(true)
        expect(tables.at(2).attributes.at(1).foreign_key).toBe("Entidad 1")
    })
})

describe("Generate SQL", () => {
    test("1:N relation", () => {
        const filteredTables = filterTables(oneNGraph)
        const tables = process1NRelation(filteredTables.at(0))
        const sql = generate1NSQL(tables);
        const expectedSQL = 
`CREATE TABLE Entidad (
  Atributo VARCHAR(40) PRIMARY KEY
);

CREATE TABLE Entidad_1 (
  Atributo VARCHAR(40) PRIMARY KEY,
  Atributo_Entidad VARCHAR(40) REFERENCES Entidad
);
`;
        // Custom matcher to ignore whitespace differences
        expect(sql.replace(/\s+/g, '')).toBe(expectedSQL.replace(/\s+/g, ''));
    });

    test("1:1 relation, 1:1-1:1", () => {
        const filteredTables = filterTables(oneOneGraph)
        const tables = process11Relation(filteredTables.at(0))
        const sql = generate11SQL(tables);
        const expectedSQL = 
`CREATE TABLE Relación (
  Atributo_Entidad VARCHAR(40) PRIMARY KEY,
  Atributo_Entidad_1 VARCHAR(40) UNIQUE NOT NULL
);
`;
        // Custom matcher to ignore whitespace differences
        expect(sql.replace(/\s+/g, '')).toBe(expectedSQL.replace(/\s+/g, ''));
    });

    test("1:1 relation, 0:1-1:1", () => {
        oneOneGraph.relations.at(0).side1.cardinality = "0:1"
        const filteredTables = filterTables(oneOneGraph)
        const tables = process11Relation(filteredTables.at(0))
        const sql = generate11SQL(tables);
        const expectedSQL = 
`CREATE TABLE Entidad_1 (
  Atributo VARCHAR(40) PRIMARY KEY
);

CREATE TABLE Entidad (
  Atributo VARCHAR(40) PRIMARY KEY,
  Atributo_Entidad_1 VARCHAR(40) UNIQUE NOT NULL REFERENCES Entidad_1
);
`;
        // Custom matcher to ignore whitespace differences
        expect(sql.replace(/\s+/g, '')).toBe(expectedSQL.replace(/\s+/g, ''));
    });

    test("1:M relation", () => {
        const filteredTables = filterTables(nMGraph);
        const tables = processNMRelation(filteredTables.at(0));
        const sql = generateNMSQL(tables);
        const expectedSQL = 
`CREATE TABLE Entidad (
  Atributo VARCHAR(40) PRIMARY KEY
);

CREATE TABLE Entidad_1 (
  Atributo VARCHAR(40) PRIMARY KEY
);

CREATE TABLE Relación (
  Atributo_Entidad VARCHAR(40) REFERENCES Entidad,
  Atributo_Entidad_1 VARCHAR(40) REFERENCES Entidad_1,
  Atributo VARCHAR(40),
  PRIMARY KEY (Atributo_Entidad, Atributo_Entidad_1)
);`;

        // Custom matcher to ignore whitespace differences
        expect(sql.replace(/\s+/g, '')).toBe(expectedSQL.replace(/\s+/g, ''));
    });


    test("Complete Graph", () => {
        const sql = generateSQL(oneNGraphAndEntity)

        const expectedSQL = 
`
CREATE TABLE Entidad_1 (
  Atributo VARCHAR(40) PRIMARY KEY
);

CREATE TABLE Entidad_2(
  Atributo VARCHAR(40) PRIMARY KEY,
  Atributo_Entidad_1 VARCHAR(40) NOT NULL REFERENCES Entidad_1
);

CREATE TABLE Entidad (
  Atributo VARCHAR(40) PRIMARY KEY
);
`;

        // Custom matcher to ignore whitespace differences
        expect(sql.replace(/\s+/g, '')).toBe(expectedSQL.replace(/\s+/g, ''));
    });
});
