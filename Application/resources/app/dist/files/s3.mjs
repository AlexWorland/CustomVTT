import AWS from"aws-sdk";import S3 from"aws-sdk/clients/s3.js";import fs from"fs";import minimatch from"minimatch";import path from"path";import AbstractFileStorage from"./storage.mjs";import{encodeURL,mergeObject}from"../../common/utils/helpers.mjs";export default class S3FileStorage extends AbstractFileStorage{constructor(e,t,s){super(e),this.config=t,this.client=new S3(t),this.buckets=s}static fromConfig(e,t){if(!t)return null;let s={},n=null;if(!0===t)logger.info("Configuring AWS credentials using system configuration or environment variables");else if("string"==typeof t){let e=t;if(fs.existsSync(e)||(e=path.join(paths.config,t)),!fs.existsSync(e)){const t=new Error(`The requested AWS config path ${e} does not exist!`);return logger.error(t),null}const i=JSON.parse(fs.readFileSync(e,"utf-8"));mergeObject(s,i),i.buckets instanceof Array&&(n=i.buckets),logger.info(`Configured AWS credentials using ${e}`)}const i=new AWS.Config(s);try{return new this(e,i,n)}catch(e){return logger.error(e),null}}async createDirectory(e,{bucket:t}={}){let s=e;return s=path.posix.join(s.slugify(),"/"),new Promise(((n,i)=>{this.client.headObject({Bucket:t,Key:s},(r=>{if(!r)return i(new Error(`The S3 key ${s} already exists and cannot be created`));this.client.upload({Bucket:t,Key:s,Body:""},(s=>{if(s)return i(s);const r=`Created subdirectory in S3 s3://${t}/${e}`;logger.info(r),n(e)}))}))}))}async getFiles({target:e=".",extensions:t=[],wildcard:s=!1,bucket:n="",isAdmin:i=!1,type:r}={}){const o={target:e=decodeURIComponent(e),private:!1,gridSize:null,dirs:[],privateDirs:[],files:[],extensions:t.map((e=>e.toLowerCase()))};if(!n)return o.dirs=await this._listBuckets(),o;let a="";s&&(a=path.basename(e),e=path.dirname(e)),!e||e.endsWith("/")||path.extname(e)||(e+="/");const c=this.configuration[n]||{},l=Object.keys(c);l.sort(((e,t)=>{const s=t.split("/").length-e.split("/").length;return 0!==s?s:""===e?1:""===t?-1:e.localeCompare(t)}));let u=l.find((t=>RegExp(`^${t}/`).test(`${e}/`)));const f=u?c[u]:{private:!1,gridSize:null};if(o.private=f.private,f.private&&!i)return o;const{keys:p,prefixes:h}=await this._listContents(n,e);for(let e of h){const t=e.endsWith("/")?e.slice(0,-1):e;if(t in c&&c[t].private){if(!i)continue;o.privateDirs.push(t)}o.dirs.push(t)}if("folder"!==r)for(let t of p){let n=path.posix.relative(e,t);""!==n&&(s&&!minimatch(n,a)||o.extensions.length&&!o.extensions.includes(path.extname(t).toLowerCase())||o.files.push(t))}return o.bucket=n,o.files=this.toClientPaths(o.files,n),o}async _listBuckets(){if(this.buckets)return this.buckets;console.log("Searching for allowed buckets for S3 storage.");const e=await new Promise(((e,t)=>{this.client.listBuckets(((s,n)=>{if(s)return t(s);const i=n.Buckets?n.Buckets.map((e=>e.Name)):[];e(i)}))})),t=[];for(let s of e){await this._testBucket(s)&&t.push(s)}return this.buckets=t}async _testBucket(e){return new Promise((t=>{this.client.headBucket({Bucket:e},(e=>{t(null===e)}))}))}async _listContents(e,t){const s={Bucket:e,MaxKeys:1e3,Delimiter:"/"};"."!==t&&(s.Prefix=t);let n=!0;const i=[],r=new Set,o=e=>new Promise(((t,s)=>{this.client.listObjectsV2(e,((e,n)=>{e&&s(e),t({keys:n.Contents.map((e=>e.Key)),prefixes:n.CommonPrefixes.map((e=>e.Prefix)),nextToken:n.IsTruncated?n.NextContinuationToken:null})}))}));for(;n;){const e=await o(s);i.push(...e.keys);for(let t of e.prefixes)r.add(t);e.nextToken&&(s.ContinuationToken=e.nextToken),null===e.nextToken&&(n=!1)}return{keys:i,prefixes:r}}async upload(e,{bucket:t,contentType:s,target:n}={}){const i=path.posix.join(n,e.name);return new Promise(((n,r)=>{this.client.upload({Bucket:t,Key:i,Body:e.data,ContentType:s||"text/plain",ACL:"public-read"},(s=>{if(s)return r(`File upload failed: ${s.message}`);const o=`Uploaded file ${e.name} to S3 s3://${t}/${i}`;logger.info(o),n({status:"success",message:o,path:this.toClientPath(i,t)})}))}))}toClientPath(e,t){return`${this.client.endpoint.protocol}//${t}.${this.client.endpoint.hostname}/${encodeURL(e)}`}}