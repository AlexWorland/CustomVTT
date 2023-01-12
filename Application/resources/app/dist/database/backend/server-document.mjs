import fs from"fs";import path from"path";import Datastore from"./datastore.mjs";import{DOCUMENT_OWNERSHIP_LEVELS}from"../../../common/constants.mjs";import{mergeObject}from"../../../common/utils/helpers.mjs";import*as fields from"../../../common/data/fields.mjs";const ServerDocumentMixin=t=>class extends t{static name="ServerDocumentMixin";static async connect(){return Datastore.connect(this.collectionName,this.filename)}static get connected(){return Datastore.datastores.has(this.collectionName)}static get db(){if(!game.active)throw new Error(`You cannot access the ${this.collectionName} datastore before the game is ready!`);const t=Datastore.datastores.get(this.collectionName);if(!t?.connected)throw new Error(`The ${this.collectionName} Datastore is not yet connected!`);return t}get db(){return this.constructor.db}static async disconnect(){this.db?.connected&&await this.db.disconnect()}static get filename(){const t=global.game.world;if(!t)throw new Error(`You cannot access the ${this.collectionName} datastore before the game is ready!`);return path.join(t.path,"data",`${this.collectionName}.db`)}static dump({sort:t}={}){const e={};return t&&(e.sort={[t]:1}),this.db.findMany({},e)}static async get(t,e={},s){const i=await this.db.findOne({_id:t});if(null===i){if(!0===e.strict)throw new Error(`The ${this.name} ${t} does not exist in ${this.collectionName}`);return null}return this.fromSource(i)}static async find(t={},e={}){return(await this.db.findMany(t,e)).map((t=>this.fromSource(t,e)))}async save(){if(this.invalid)throw new Error("You may not save a Document which has an invalid DataModel");return await this.db.updateOne({_id:this.id},this.toJSON()),this}async loadRelatedDocuments(){}static async sanitizeUserInput(t,{documentId:e,fieldPath:s=[],user:i}={}){return this._sanitizeFields(this.sanitizedFields,t,{assetPath:this.extractedAssetPath,documentId:e||t._id,fieldPath:s,user:i})}static async _sanitizeFields(t,e,{fieldPath:s,...i}={}){for(const[a,n]of Object.entries(e)){const o=t[a];if(!o)continue;const r=s.concat([a]);if(o instanceof fields.DataField)e[a]=o.sanitize(n,{fieldPath:r,...i});else if(o instanceof Array){const t=o[0];await Promise.all(n.map(((e,s)=>{const a=e._id??s;return this._sanitizeFields(t,e,{fieldPath:r.concat([a]),...i})})))}else o instanceof Object&&await this._sanitizeFields(o,n,{fieldPath:r,...i})}return e}static get sanitizedFields(){return this._sanitizedFields||(this._sanitizedFields=this.schema.apply((function(t,e){if(this.sanitize)return this}),{},{filter:!0,initializeArrays:!0})),this._sanitizedFields}static _sanitizedFields;static get extractedAssetPath(){const t=this.package??game.world;return path.join(t.path,"assets",this.metadata.collection)}_deleteExtractedAssets(){const t=this.constructor.extractedAssetPath;if(!fs.existsSync(t))return;const e=this.parent?[this.parent.id,this.collectionName,this.id].join("-"):this.id;for(const s of fs.readdirSync(t))if(s.startsWith(e)){const e=path.join(t,s);fs.unlinkSync(e),logger.info(`${vtt} | Deleted extracted base64 asset: ${e}`)}}async _preCreate(t,e,s){await super._preCreate(t,e,s);const i=this.constructor.metadata;for(const t of Object.values(i.embedded))for(let s of this[t])s.id&&!1!==e.keepEmbeddedIds||s.updateSource({_id:db.embeddedStore.createNewId()});this.ownership&&!(s.id in this.ownership)&&this.updateSource({[`ownership.${s.id}`]:DOCUMENT_OWNERSHIP_LEVELS.OWNER}),this.tagDocumentStats({user:s})}async _preUpdate(t,e,s){await super._preUpdate(t,e,s),this.tagDocumentStats({changes:t,user:s})}async _onDelete(t,e){await super._onDelete(t,e),this._deleteExtractedAssets()}tagDocumentStats({changes:t,user:e}={}){if(!this.schema.has("_stats"))return;const s=this._stats,{release:i,game:a}=global,n={modifiedTime:Date.now()};e&&(n.lastModifiedBy=e.id),s.createdTime||t||(n.createdTime=n.modifiedTime),s.coreVersion!==i.version&&(n.coreVersion=i.version),s.systemId!==a.system.id&&(n.systemId=a.system.id),s.systemVersion!==a.system.version&&(n.systemVersion=a.system.version),this.updateSource({_stats:n}),t&&mergeObject(t,{_stats:n})}};export default ServerDocumentMixin;