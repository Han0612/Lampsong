import {scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCallback);
// Only a salted, expensive verifier is stored in the private server store.
// Neither a plaintext password nor a verifier is shipped with static assets.
export async function verifyPassword(password,record){
  if(!record||record.version!==1||record.algorithm!=='scrypt'||typeof password!=='string'||password.length>1024)return false;
  const actual=await scrypt(password,Buffer.from(record.salt,'hex'),32,{N:32768,r:8,p:1,maxmem:64*1024*1024});
  const expected=Buffer.from(record.digest,'hex');
  return expected.length===actual.length&&timingSafeEqual(actual,expected);
}
