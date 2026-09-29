import { requireOrigin } from "@/lib/auth";
import { env } from "cloudflare:workers";
import { db,jsonError,member } from "@/lib/server";
export const runtime="edge";
type Context={params:Promise<{id:string}>};
export async function POST(request:Request,{params}:Context){try{if(!await requireOrigin(request))return jsonError("Invalid request origin.",403);
  const user=await member();if(!user)return jsonError("Not authorised.",403);const {id}=await params;
  const row=await db().prepare("SELECT traveler,created_by AS createdBy FROM places WHERE id=?").bind(id).first<{traveler:string;createdBy:string}>();
  if(!row||(row.traveler!==user.role&&row.traveler!=="both"))return jsonError("You cannot add photos here.",403);
  const count=await db().prepare("SELECT COUNT(*) AS n FROM photos WHERE place_id=?").bind(id).first<{n:number}>();if((count?.n??0)>=3)return jsonError("Maximum three photos per place.",400);
  const form=await request.formData(),file=form.get("photo");if(!(file instanceof File)||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>3_000_000)return jsonError("Choose a JPEG, PNG or WebP photo under 3 MB.",400);
  if(!env.BUCKET)return jsonError("Photo storage unavailable.",503);
  const photoId=crypto.randomUUID(),key=`places/${id}/${photoId}`;
  await env.BUCKET.put(key,file.stream(),{httpMetadata:{contentType:file.type}});
  try{await db().prepare("INSERT INTO photos(id,place_id,object_key,content_type) VALUES(?,?,?,?)").bind(photoId,id,key,file.type).run()}catch(e){await env.BUCKET.delete(key);throw e}
  return Response.json({id:photoId},{status:201});
}catch{return jsonError("Could not upload the photo.",503)}}
