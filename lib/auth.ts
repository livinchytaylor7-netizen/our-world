import { env } from "cloudflare:workers";
import { cookies, headers } from "next/headers";

type AuthEnv = { DB:D1Database; OWNER_EMAIL:string; SETUP_KEY:string; APP_ORIGIN:string; RESEND_API_KEY?:string; MAIL_FROM?:string };
export const config=env as unknown as AuthEnv;
const encoder=new TextEncoder();
export function bytes(bytes:Uint8Array){return Array.from(bytes,x=>x.toString(16).padStart(2,"0")).join("")}
export function randomToken(){return bytes(crypto.getRandomValues(new Uint8Array(32)))}
export async function digest(value:string){return bytes(new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(value))))}
export async function passwordHash(password:string,salt:string){const key=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);return bytes(new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",salt:encoder.encode(salt),iterations:310000,hash:"SHA-256"},key,256)))}
export function equal(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}
export function email(value:unknown){const s=String(value??"").trim().toLowerCase();return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)&&s.length<200?s:""}
export function passwordValid(value:unknown){return typeof value==="string"&&value.length>=12&&value.length<=128}
export async function currentUser(){const token=(await cookies()).get("ow_session")?.value;if(!token||!config.DB)return null;const row=await config.DB.prepare("SELECT a.id,a.email,a.role FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>? AND a.enabled=1").bind(await digest(token),Date.now()).first<{id:string;email:string;role:"owner"|"partner"}>();return row??null}
export async function requireOrigin(request:Request){const origin=request.headers.get("origin");const host=new URL(request.url).origin;return origin===host}
export async function issueSession(accountId:string){const token=randomToken();await config.DB.prepare("INSERT INTO sessions(token_hash,account_id,expires_at) VALUES(?,?,?)").bind(await digest(token),accountId,Date.now()+30*86400000).run();return `ow_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`}
export async function rateLimit(key:string,max=8){const now=Date.now(),row=await config.DB.prepare("SELECT count,window_start AS start FROM auth_attempts WHERE key=?").bind(key).first<{count:number;start:number}>();const count=row&&now-row.start<3600000?row.count+1:1;await config.DB.prepare("INSERT INTO auth_attempts(key,count,window_start) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET count=excluded.count,window_start=excluded.window_start").bind(key,count,row&&now-row.start<3600000?row.start:now).run();return count<=max}
export async function sendReset(to:string,link:string){if(!config.RESEND_API_KEY||!config.MAIL_FROM)throw Error("Email delivery not configured");const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${config.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from:config.MAIL_FROM,to:[to],subject:"Reset your Our World password",text:`Open this link to reset your password. It expires in 30 minutes: ${link}`})});if(!r.ok)throw Error("Email delivery unavailable")}
export async function clientIP(){return (await headers()).get("cf-connecting-ip")??"unknown"}
