import {one} from '../database/client'; export const syncState=()=>one<any>('SELECT * FROM sync_state WHERE id=1');
