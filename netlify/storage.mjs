// Adapt the existing, tested settings API to a site-wide Netlify Blobs store.
// Deploy-specific stores are deliberately avoided: saves must survive redeploys.
export function createBucket(store,coverSeed={}){
  return {
    async get(key){
      const item=await store.getWithMetadata(key,{type:'text',consistency:'strong'});
      if(item)return {etag:item.etag,json:async()=>JSON.parse(item.data),text:async()=>item.data};
      const match=key.match(/^cover-lyrics\/v1\/([0-6])\.json$/);
      const lines=match&&coverSeed[match[1]];
      if(lines)return {etag:null,json:async()=>structuredClone(lines),text:async()=>JSON.stringify(lines)};
      return null;
    },
    async put(key,text,options={}){
      const condition=options.onlyIf?.etagMatches?{onlyIfMatch:options.onlyIf.etagMatches}:options.onlyIf?.etagDoesNotMatch==='*'?{onlyIfNew:true}:{};
      const result=await store.set(key,text,condition);
      if(!result.modified)return null;
      // Never acknowledge an unverified write; the caller needs its next revision.
      if(!result.etag)throw Error('Storage did not return a committed revision');
      return {etag:result.etag};
    },
    async delete(key){await store.delete(key);}
  };
}
