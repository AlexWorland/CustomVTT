import fs from"fs";import path from"path";import*as fields from"../../common/data/fields.mjs";import{cleanHTML}from"./validators.mjs";import Files from"../files/files.mjs";import{fromUuid}from"../core/utils.mjs";import{randomID}from"../../common/utils/helpers.mjs";export default function initializeFieldSanitization(){fields.HTMLField.prototype.sanitize=sanitizeHTMLField,fields.FilePathField.prototype.sanitize=sanitizeFilePathField}function sanitizeFilePathField(t,{assetPath:e,documentId:i,fieldPath:a,user:o}={}){if(!t||this.base64)return t;const s=t.match(/^data:([a-z]+)\/([a-z]+);base64,(.*)/);if(!s)return t;if(o&&!o.can("FILES_UPLOAD"))throw new Error(`You lack FILES_UPLOAD permission and may not upload base64 data to the ${this.name} field.`);const[n,r]=s.slice(2,4),l=`${[i,...a].filterJoin("-")}.${n}`,m=path.join(e,l);return Files.mkdir(e),fs.writeFileSync(m,Buffer.from(r,"base64")),global.logger.info(`${vtt} | Extracted base64 asset: "${m}"`),Files.standardizePath(path.relative(global.paths.data,m))}export async function handleDocumentAssetUpload(t,e){const i=await fromUuid(t),a=i.constructor.extractedAssetPath,o=e.name.split("."),s=o.pop();return e.name=`${o.join(".")}-${randomID()}.${s}`,e.name=i.parent?[i.parent.id,i.collectionName,i.id,e.name].join("-"):e.name,Files.mkdir(a),Files.standardizePath(path.relative(global.paths.data,a))}function sanitizeHTMLField(t,e={}){return t?cleanHTML(t):t}