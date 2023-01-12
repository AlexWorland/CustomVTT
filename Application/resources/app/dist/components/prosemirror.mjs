import{EditorState}from"prosemirror-state";import{Step}from"prosemirror-transform";import{defaultSchema}from"../../prosemirror/prosemirror.mjs";import{serializeHTMLString}from"../../prosemirror/util.mjs";import{fromUuid}from"../core/utils.mjs";import{getProperty,isEmpty}from"../../common/utils/helpers.mjs";export default class ProseMirrorAuthority{constructor(t,r){this.#t=t,this.#r=r,this.#e()}#r;get doc(){return this.#r}#s=0;get version(){return this.#s}#o=0;get offset(){return this.#o}#t;#i;history=[];users=new Set;applySteps(t,r){r.forEach((r=>{r=Step.fromJSON(defaultSchema,r);try{this.#r=r.apply(this.#r).doc}catch(r){return void logger.warn(`Failed to apply collaborative editing step for user ${t}. Editors may be in an inconsistent state.`)}this.#s++,this.history.push({userId:t,step:r})})),this.#a()}broadcast(t,...r){const{game:e}=global;for(const s of this.users){const o=e.users.find((t=>t.id===s));o&&o.sockets.forEach((e=>e.emit(t,...r)))}}#a(){const t=this.history.length-ProseMirrorAuthority.#n;t<1||(this.history.splice(0,t),this.#o+=t)}async#e(){let t=await db.Setting.getValue("core.editorAutosaveSecs")||60;t=Math.clamped(t,30,300),this.#i=setInterval(this.#c.bind(this),1e3*t)}async#c(){const{logger:t}=global,r=serializeHTMLString(this.doc),[e,s]=this.#t.split("#"),o=await fromUuid(e);if(o||t.warn(`Tried to autosave contents of ProseMirror instance '${this.#t}' but could not retrieve the document.`),!game?.ready)return;o.isEmbedded||o.constructor.connected||await o.constructor.connect();const i=o.updateSource({[s]:r});if(!isEmpty(getProperty(i,s))){t.debug(`Broadcasting autosave update for instance '${this.#t}'.`);for(const t of game.users)t.sockets.forEach((t=>t.emit("pm.autosave",this.#t,r)));return o.isEmbedded?o.parent.save():o.save()}}static#n=256;static#u=new Map;static async create(t,r){const e=EditorState.fromJSON({schema:defaultSchema},r).doc;return new ProseMirrorAuthority(t,e)}static async getOrCreate(t,r){const e=ProseMirrorAuthority.#u,s=e.get(t)??await this.create(t,r);return s?(e.has(t)||e.set(t,s),s):null}static socketListeners(t){t.on("pm.editDocument",ProseMirrorAuthority.#d.bind(this,t.userId)),t.on("pm.receiveSteps",ProseMirrorAuthority.#h.bind(this,t)),t.on("pm.endSession",ProseMirrorAuthority.#m.bind(this,t.userId)),t.on("disconnect",ProseMirrorAuthority.#p.bind(this,t.userId))}static async#d(t,r,e,s){const o=await this.getOrCreate(r,e);if(!o)return s({});logger.debug(`Starting edit session for user '${t}' and instance '${r}'.`),o.users.add(t);s({state:EditorState.create({doc:o.doc}),version:o.version,users:Array.from(o.users)}),o.broadcast("pm.usersEditing",r,Array.from(o.users))}static#m(t,r){const{game:e}=global,s=ProseMirrorAuthority.#u.get(r);if(!s)return;s.users.delete(t)&&logger.debug(`Retiring user '${t}' from editing session for instance '${r}'.`),e.ready&&s.users.size?s.broadcast("pm.usersEditing",r,Array.from(s.users)):(logger.debug(`Instance '${r}' has no more active editors, cleaning up.`),clearInterval(s.#i),ProseMirrorAuthority.#u.delete(r))}static#p(t){for(const r of ProseMirrorAuthority.#u.keys())ProseMirrorAuthority.#m(t,r)}static#h(t,r,e,s){const{logger:o}=global,i=ProseMirrorAuthority.#u.get(r);if(!i)return void o.error("Editing steps were received for an JournalEntryPage that is not in an editing state.");const a=i.version-e;a>ProseMirrorAuthority.#n?t.emit("pm.resync",r):0===a&&(i.applySteps(t.userId,s),i.broadcast("pm.newSteps",r,i.offset,i.history))}}