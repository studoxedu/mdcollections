import * as SQLite from 'expo-sqlite'; import {schema} from './schema';
let db:SQLite.SQLiteDatabase|null=null; export const getDb=()=>{if(!db){db=SQLite.openDatabaseSync('shopstock.db');db.execSync(schema);}return db};
export const tx=<T>(fn:(d:SQLite.SQLiteDatabase)=>T)=>getDb().withTransactionSync(()=>fn(getDb()));
export const q=<T=any>(sql:string,params:any[]=[]):T[]=>getDb().getAllSync<T>(sql,params); export const one=<T=any>(sql:string,params:any[]=[]):T|undefined=>q<T>(sql,params)[0]; export const run=(sql:string,params:any[]=[])=>(getDb().runSync(sql,params),true);
