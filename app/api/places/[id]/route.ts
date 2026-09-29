import { requireOrigin } from "@/lib/auth";
import { env } from "cloudflare:workers";
import { COUNTRY_BY_NAME } from "@/lib/places";
import { db,jsonError,member,validPlace } from "@/lib/server";
export const runtime="edge";
type Context={params:Promise<{id:string}>};
async function canEdit(id:string,user:{id:string;role:string}){
  const row=await db().prepare("SELECT traveler,created_by AS createdBy FROM places WHERE id=?").bind(id).first<{traveler:string;createdBy:string}>();
  return row&&(row.traveler===user.role||row.traveler==="both")?row:null;
}
export async function PUT(request:Request,{params}:Context){try{if(!await requireOrigin(request))return jsonError("Invalid request origin.",403);
  const user=await member();if(!user)return jsonError("Not authorised.",403);
  const {id}=await params;if(!await canEdit(id,user))return jsonError("You cannot change this place.",403);
  const x=await request.json();if(!validPlace(x))return jsonError("Check the place details.",400);
  if(x.traveler!=="both"&&x.traveler!==user.role)return jsonError("Choose your own or a shared trip.",403);
  const country=COUNTRY_BY_NAME.get(x.country.trim().toLowerCase())?.[0]??x.country.trim();
  await db().prepare("UPDATE places SET country=?,city=?,month=?,traveler=?,status=?,note=?,updated_at=? WHERE id=?").bind(country,x.city.trim(),x.month,x.traveler,x.status,x.note.trim(),Date.now(),id).run();return Response.json({id});
}catch{return jsonError("Could not update this place.",503)}}
export async function DELETE(request:Request,{params}:Context){try{if(!await requireOrigin(request))return jsonError("Invalid request origin.",403);
  const user=await member();if(!user)return jsonError("Not authorised.",403);
  const {id}=await params;if(!await canEdit(id,user))return jsonError("You cannot delete this place.",403);
  const pictures=await db().prepare("SELECT object_key AS objectKey FROM photos WHERE place_id=?").bind(id).all<{objectKey:string}>();
  await db().batch([db().prepare("DELETE FROM photos WHERE place_id=?").bind(id),db().prepare("DELETE FROM places WHERE id=?").bind(id)]);
  if(env.BUCKET)await Promise.all((pictures.results??[]).map(p=>env.BUCKET!.delete(p.objectKey).catch(()=>{})));
  return Response.json({deleted:true});
}catch{return jsonError("Could not delete this place.",503)}}
