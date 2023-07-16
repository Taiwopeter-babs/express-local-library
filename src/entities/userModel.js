#!/usr/bin/node
const { v4: uuidv4 } = require('uuid');
const { EntitySchema } = require('typeorm');


const UserEntity = new EntitySchema({
    name: "User",
    tableName: "users",
    columns: {
        id: {
            primary: true,
            type: "varchar",
            length: 100,
        },
        first_name: {
            type: "varchar",
            length: 50,
            nullable: false,
        },
        last_name: {
            type: "varchar",
            length: 50,
            nullable: false,
        },
        birthday: {
            type: "date",
            nullable: false
        },
        email: {
            type: "varchar",
            length: 100,
            nullable: false,
            unique: true
        },
        valid_email: {
            type: "boolean",
            default: false
        },
        password: {
            type: "varchar",
            length: 256,
            nullable: false
        }
    }
})

module.exports = UserEntity;
