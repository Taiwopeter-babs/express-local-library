#!/usr/bin/node
import { v4 as uuidv4 } from 'uuid';
import { EntitySchema } from 'typeorm';


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
            nullable: false
        },
        password: {
            type: "varchar",
            length: 256,
            nullable: false
        }
    }
})

export default UserEntity;
