import DatabaseBackend from"../../../common/abstract/backend.mjs";import{expandObject}from"../../../common/utils/helpers.mjs";import{handleEvent}from"../../server/sockets.mjs";import{EmbeddedCollectionField}from"../../../common/data/fields.mjs";export default class ServerDatabaseBackend extends DatabaseBackend{socketListeners(e){e.on("modifyDocument",handleEvent.bind(e,"modifyDocument",this.modifyDocument.bind(this)))}async modifyDocument(e,t){const a=global.db,o=this[t.action];if(!(o instanceof Function))throw new Error(`Invalid Document modification action ${t.action} requested`);let r=a[t.type];if(!r)throw new Error(`Invalid Document type ${t.type} provided for database modification operation`);let n=t.parentType?a[t.parentType]:r;return t.pack&&(n=a.packs.get(t.pack),t.parentId||(r=n),n.connected||await n.connect()),n.db.semaphore.add(o.bind(this),r,t,e)}async _getParent(e){let t=null;if(e.parentId&&e.parentType){const a=e.pack?db.packs.get(e.pack):db[e.parentType];t=await a.get(e.parentId,{strict:!0})}return t}async _getDocuments(e,{query:t,options:a},o){if(a.index){const o=a.indexFields||["name","img","thumb","type"],r=["password","passwordSalt"];for(const t of o)if(r.includes(t)||e.schema.get(t)instanceof EmbeddedCollectionField)throw new Error(`You are not allowed to request the "${t}" field as a compendium index.`);return e.db.findMany(t,{project:o.reduce(((e,t)=>(e[t]=1,e)),{}),sort:{name:1}})}return e.find(t,{safe:!0})}async _getEmbeddedDocuments(e,t,{query:a,options:o},r){o.broadcast=!1;const n=t.getEmbeddedCollection(e.documentName);return Array.from(n.values())}async _createDocuments(e,{data:t,options:a,pack:o},r){const n=e.documentName,i=[];if(a.temporary)throw new Error("It is no longer supported to create temporary documents via a server-side creation request.");for(let n of t){a.keepId||delete n._id,n._id||(n._id=e.db.createNewId()),n=expandObject(n),await e.sanitizeUserInput(n,{user:r});const t=e.fromSource(n,{pack:o});if(await t.loadRelatedDocuments(),r&&!t.canUserModify(r,"create",n))throw new Error(this._logError(r,"create",t,{pack:o}));await t._preCreate(n,a,r),t.validate({fields:!0,joint:!0,strict:!0}),i.push((async()=>{const o=t.toJSON(),i=await e.db.insertOne(o);return t.updateSource({_id:i._id}),t._onCreate(n,a,r),t}))}const d=await Promise.all(i.map((e=>e())));return this._logOperation("Created",n,d,{level:"info",pack:o}),d}async _createEmbeddedDocuments(e,t,{data:a,options:o,pack:r},n){const i=e.documentName,d=t[e.collectionName];if(o.temporary)throw new Error("It is no longer supported to create temporary documents via a server-side creation request.");const s=[];for(let i of a){if(i._id&&o.keepId||(i._id=db.embeddedStore.createNewId()),d.has(i._id))throw new Error(`The _id [${i._id}] already exists within ${t.documentName} [${t.id}] ${e.collectionName}`);i=expandObject(i),await e.sanitizeUserInput(i,{documentId:t.id,fieldPath:[e.collectionName,i._id],user:n});const a=e.fromSource(i,{parent:t,pack:r});if(await a.loadRelatedDocuments(),n&&!a.canUserModify(n,"create",i))throw new Error(this._logError(n,"create",a,{parent:t,pack:r}));await a._preCreate(i,o,n),a.validate({fields:!0,joint:!0,strict:!0}),d.set(a.id,a),s.push((()=>(a._onCreate(i,o,n),a)))}t.tagDocumentStats({user:n,changes:{}}),await t.save();const c=s.map((e=>e()));return this._logOperation("Created",i,c,{level:"info",parent:t,pack:r}),c}async _updateDocuments(e,{updates:t,options:a,pack:o},r){const n=e.documentName,i=[],d=new Map,s=[];for(let e of t){if(!("_id"in e))throw new Error(`You cannot update a ${n} without providing an _id`);d.set(e._id,e),s.push(e._id)}const c=await e.find({_id:{$in:s}});await Promise.all(c.map((e=>e.loadRelatedDocuments())));for(let t of c){const n=d.get(t.id);if(await e.sanitizeUserInput(n,{user:r}),r&&!t.canUserModify(r,"update",n))throw new Error(this._logError(r,"update",t,{pack:o}));const s=t.updateSource(n,a);s._id=t.id,await t._preUpdate(s,a,r),i.push((async()=>(await t.save(),t._onUpdate(s,a,r),s)))}const l=await Promise.all(i.map((e=>e())));return global.options.debug&&this._logOperation("Updated",n,c,{level:"debug",pack:o}),l}async _updateEmbeddedDocuments(e,t,{updates:a,options:o,pack:r},n){const i=e.documentName,d=t[e.collectionName],s=[],c=[];for(let i of a){let a;try{a=d.get(i._id,{strict:!0})}catch(e){if(!d.invalidDocumentIds?.has(i._id))throw e;a=d.getInvalid(i._id)}if(await a.loadRelatedDocuments(),c.push(a),await e.sanitizeUserInput(i,{documentId:t.id,fieldPath:[e.collectionName,i._id],user:n}),n&&!a.canUserModify(n,"update",i))throw new Error(this._logError(n,"update",a,{parent:t,pack:r}));const l=a.updateSource(i,o);l._id=a.id,await a._preUpdate(l,o,n),s.push((()=>(a._onUpdate(l,o,n),l)))}return t.tagDocumentStats({user:n,changes:{}}),await t.save(),global.options.debug&&this._logOperation("Updated",i,c,{level:"debug",parent:t,pack:r}),s.map((e=>e()))}async _deleteDocuments(e,{ids:t,options:a,pack:o},r){const n=e.documentName,i=[];if(a.deleteAll&&!r.isGM)throw new Error(this._logError(r,"delete",`all ${n} Documents`,{pack:o}));const d=a.deleteAll?{}:{_id:{$in:t}},s=await e.find(d);for(let t of s)if(t.invalid&&r.isGM)i.push((async()=>(await e.db.deleteOne({_id:t.id}),t.id)));else{if(await t.loadRelatedDocuments(),r&&!t.canUserModify(r,"delete"))throw new Error(this._logError(r,"delete",t,{pack:o}));await t._preDelete(a,r),i.push((async()=>(await e.db.deleteOne({_id:t.id}),t._onDelete(a,r),t.id)))}const c=await Promise.all(i.map((e=>e())));return this._logOperation("Deleted",n,s,{level:"info",pack:o}),c}async _deleteEmbeddedDocuments(e,t,{ids:a,options:o,pack:r},n){const i=e.documentName,d=t[e.collectionName],s=[],c=[];for(let e of o.deleteAll?d.keys():a){const a=d.get(e,{strict:!0});if(c.push(a),await a.loadRelatedDocuments(),n&&!a.canUserModify(n,"delete"))throw new Error(this._logError(n,"delete",a,{parent:t,pack:r}));await a._preDelete(o,n),d.delete(a.id),s.push((()=>(a._onDelete(o,n),a.id)))}t.tagDocumentStats({user:n,changes:{}}),await t.save();const l=s.map((e=>e()));return this._logOperation("Deleted",i,c,{level:"info",parent:t,pack:r}),l}getFlagScopes(){}getCompendiumScopes(){return Array.from(global.db.packs.keys())}_getLogger(){return globalThis.logger}}