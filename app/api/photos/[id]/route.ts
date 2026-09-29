import { requireOrigin } from "@/lib/auth";
import { env } from "cloudflare:workers";
import { db,jsonError,member } from "@/lib/server";
export const runtime="edge";
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Context){try{
  if(!await member())return jsonError("Not authorised.",403);const {id}=await params;
  const photo=await db().prepare("SELECT object_key AS objectKey,content_type AS contentType FROM photos WHERE id=?").bind(id).first<{objectKey:string;contentType:string}>();if(!photo)return jsonError("Photo not found.",404);
  const object=await env.BUCKET?.get(photo.objectKey);if(!object)return jsonError("Photo unavailable.",404);
  return new Response(object.body,{headers:{"Content-Type":photo.contentType,"Cache-Control":"private, max-age=300","X-Content-Type-Options":"nosniff"}});
}catch{return jsonError("Could not load the photo.",503)}}
export async function DELETE(request:Request,{params}:Context){try{if(!await requireOrigin(request))return jsonError("Invalid request origin.",403);
  const user=await member();if(!user)return jsonError("Not authorised.",403);const {id}=await params;
  const photo=await db().prepare("SELECT ph.object_key AS objectKey,p.traveler,p.created_by AS createdBy FROM photos ph JOIN places p ON p.id=ph.place_id WHERE ph.id=?").bind(id).first<{objectKey:string;traveler:string;createdBy:string}>();
  if(!photo)return jsonError("Photo not found.",404);if(photo.traveler!==user.role&&photo.traveler!=="both")return jsonError("You cannot remove this photo.",403);
  await db().prepare("DELETE FROM photos WHERE id=?").bind(id).run();await env.BUCKET?.delete(photo.objectKey);return Response.json({deleted:true});
}catch{return jsonError("Could not remove the photo.",503)}}
