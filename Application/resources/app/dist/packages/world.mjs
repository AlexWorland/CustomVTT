import fs from"fs";import path from"path";import{USER_ROLES,PACKAGE_AVAILABILITY_CODES}from"../../common/constants.mjs";import{getRoute,isNewerVersion,isEmpty,randomID,deepClone}from"../../common/utils/helpers.mjs";import{BaseWorld}from"../../common/packages/module.mjs";import{PackageAssetField,ServerPackageMixin}from"./package.mjs";import Activity from"../components/activity.mjs";import migrations from"../migrations.mjs";import Files from"../files/files.mjs";export default class World extends(ServerPackageMixin(BaseWorld)){static defineSchema(){const e=super.defineSchema();return e.background=new PackageAssetField({required:!1,blank:!0,relativeToPackage:!1,mustExist:!1}),e}_initialize(e){super._initialize(e),this.system=packages.System.get(this._source.system),this.modules=packages.Module.getPackages({system:this.system,enforceCompatibility:!0}),this.compatibility.maximum=this.compatibility.maximum||this.system?.compatibility.maximum,this.background=this.background||this.system?.background}_testAvailability(){const e=PACKAGE_AVAILABILITY_CODES;if(!this.system)return e.REQUIRES_SYSTEM;const t=this.system.availability;if(this.system.incompatibleWithCoreVersion)return t;const s=super._testAvailability();return s===e.AVAILABLE&&t===e.REQUIRES_UPDATE?t:s}vend(){const e=super.vend();return e.system=this._source.system,e}static loadLocalManifest(e){const{manifestData:t}=super.loadLocalManifest(e);return this.schema.get("id").validate(t.id)&&(e=World.#e(t)),{manifestPath:e,manifestData:t}}static#e(e){const t=e.id.slugify({strict:!0});let s=t,a=path.join(this.baseDir,s),i=0;for(;fs.existsSync(a);)s=`${t}-${++i}`,a=path.join(this.baseDir,s);const o=path.join(this.baseDir,e.id);fs.renameSync(o,a),e.id=s,delete e.name;const r=path.join(a,this.manifestFile);return Files.writeFileSyncSafe(r,JSON.stringify(e,null,2)),r}get active(){const{game:e}=global;return e.world&&this.id===e.world.id}get canAutoLaunch(){const e=this.availability,t=globalThis.release;if(e===PACKAGE_AVAILABILITY_CODES.REQUIRES_SYSTEM)return!1;if(this.incompatibleWithCoreVersion)return!1;const s=this.compatibility.verified;return!!s&&(Number.isInteger(Number(s))?s>=t.generation:!isNewerVersion(t.version,s))}static create(e){if(e.id||(e.id=e.name),!e.id)throw new Error("You must provide a unique id that names this World.");if(e.id=e.id.slugify(),e.id.startsWith(".."))throw new Error("You are not allowed to install packages outside of the designated directory path");const t=path.join(this.baseDir,e.id);if(fs.existsSync(t))throw new Error(`A World already exists in the requested directory ${e.id}.`);const s=packages.System.get(e.system);if(!s)throw new Error(`The requested system ${config.system} does not seem to exist!`);e.coreVersion=global.release.version,e.compatibility={minimum:global.release.generation,verified:global.release.generation,maximum:void 0},e.systemVersion=s.version;const a=new this(e,{strict:!0});return fs.mkdirSync(t),fs.mkdirSync(path.join(t,"data")),fs.mkdirSync(path.join(t,"scenes")),a.save(),globalThis.logger.info(`${vtt} | Created World "${a.id}"`),this.packages&&this.packages.push(a),a.vend()}static update(e){delete e.action;const t=this.get(e.id,{strict:!0});return t.updateSource(e),game.world&&(game.world=t),t.save(),t.vend()}static async install(e,t,s,a){const i=path.join(this.baseDir,e);if(fs.existsSync(i))throw new Error("You may not install a World on top of a directory that already exists.");return super.install(e,t,s,a)}static async launch(e){const t=this.get(e,{strict:!0});return await t.setup(),{redirect:"/game"}}static _convertRepositoryDataToPackageData(e,t){let s=super._convertRepositoryDataToPackageData(e,t);return s.system=e.requires.length>0?e.requires[0]:"unknown",s.coreVersion=e.version.required_core_version,s}_createPack(e){const t=path.join(this.path,"packs");fs.existsSync(t)||fs.mkdirSync(t),this._source.packs.push(e),this.reset(),this.save()}getActivePacks(e={}){const t=[],s=new Set,a=e=>{if(s.has(e.absPath))return globalThis.logger.error(`More than one package definition was pointing to the same file "${e.absPath}" Only the first one will be loaded.`);t.push(e)};this.packs.forEach(a),this.system.packs.forEach(a);for(const t of this.modules)if(!0===e[t.id])for(const e of t.packs)e.system&&e.system!==this.system.id||a(e);return t}async updateActivePacks(){const e=await global.db.Setting.getValue("core.moduleConfiguration")||{};for(const t of this.getActivePacks(e))db.defineCompendium(t)}async setup(){const{game:e,db:t,release:s,logger:a,options:i}=global;this.#t(),e.world=this,e.system=this.system;const{template:o,model:r,documentTypes:n}=e.system.loadDataTemplate();e.template=o,e.model=r,e.documentTypes=n,e.active=!0,this.reset(),await t.connect(),e.activity=new Activity(this),e.permissions=await t.Setting.getPermissions(),e.compendiumConfiguration=await t.Setting.getValue("core.compendiumConfiguration"),e.users=await t.User.getUsers();if(!e.users.filter((e=>e.role===USER_ROLES.GAMEMASTER)).length){let s=e.users.find((e=>"Gamemaster"===e.name));if(s)s.role=USER_ROLES.GAMEMASTER,await s.save();else{let s="";for(;e.users.find((e=>e.name===`Gamemaster${s}`));)s=String((parseInt(s)||0)+1);await t.User.create({name:`Gamemaster${s}`,role:USER_ROLES.GAMEMASTER})}}let d=!1;if(config.release.isGenerationalChange(this.compatibility.verified)||this.safeMode){a.info(`Launching World ${this.id} in Safe Mode`),await t.Setting.db.deleteOne({key:"core.moduleConfiguration"}),await t.Scene.db.updateMany({active:!0},{$set:{active:!1}});const e=await t.Playlist.find({playing:!0});for(let t of e){const e=t.sounds.map((e=>({_id:e.id,playing:!1})));t.updateSource({playing:!1,sounds:e}),await t.save()}this.updateSource({safeMode:!1}),d=!0}if(this.resetKeys){a.info(`Resetting all user access keys in World ${this.id}`);for(let t of e.users)await t.update({password:""});this.updateSource({resetKeys:!1}),d=!0}d&&this.save(),await this.updateActivePacks(),isNewerVersion(s.version,this.coreVersion)&&await this.migrateCore(),isNewerVersion(this.system.version,this.systemVersion)&&await this.migrateSystem(),e.ready=!0,e.paused=!i.demoMode}async deactivate(e,{asAdmin:t=!1}={}){const{config:s,db:a,game:i,express:o}=global;let r=null;if(!t){if(!e.user)return{redirect:getRoute("join",{prefix:s.options.routePrefix})};r=await a.User.get(e.user);if(!(r&&r.hasRole("GAMEMASTER")||e.session&&e.session.admin))return{redirect:getRoute("join",{prefix:s.options.routePrefix})}}for(let e of Object.keys(i))delete i[e];return i.ready=!1,i.paused=!0,i.activity&&clearInterval(i.activity._heartbeat),a.disconnect(),this.#t(),o.io.emit("shutdown",{world:this.id,userId:r?._id??null}),{redirect:getRoute("setup",{prefix:s.options.routePrefix})}}async migrateCore(){const{release:e,logger:t}=global;t.info(`Migrating World ${this.id} to updated core platform ${e.version}`);const s=this.coreVersion,a=Object.entries(migrations).reduce(((e,t)=>(isNewerVersion(t[0],s)&&(e=e.concat(t[1])),e)),[]);for(let e of a)e instanceof Function&&await e(this).catch((e=>t.error(e)));this.updateSource({coreVersion:e.version,compatibility:{minimum:e.generation,verified:e.version}}),await this.save(),t.info(`Core platform migrations for World ${this.id} to version ${e.version} completed successfully`)}async migrateSystem(){const{db:e,logger:t}=global,s=this.system;t.info(`Migrating World ${this.id} to upgraded ${s.id} System version ${s.version}`);for(let t of e.documents)t.hasSystemData&&t.migrateSystem instanceof Function&&await t.migrateSystem();await e.Scene.migrateSystem();for(let t of Array.from(e.packs.values()).filter((e=>"world"===e.metadata.package)))await t.migrate();this.updateSource({systemVersion:s.version}),await this.save(),t.info(`Migration of World ${this.id} was successful to ${s.id} System version ${s.version}`)}#t(){packages.System.resetPackages(),packages.Module.resetPackages(),packages.World.resetPackages()}static socketListeners(e,t){e.on("world",(t=>this.requestWorldData(e.session,t))),e.on("manageCompendium",t.bind(e,"manageCompendium",this._onManageCompendium.bind(this))),e.on("refreshAddresses",(async e=>{await config.express.refreshAddresses(),e(config.express.getInvitationLinks())}));const s=game.world;s.registerCustomSocket(e),s.system.registerCustomSocket(e);for(const t of s.modules)t.registerCustomSocket(e)}static async requestWorldData(e,t){const{game:s,logger:a}=global;if(!s.world)return t({});const i=e.worlds[s.world.id];if(!i)return t({});try{const e=Date.now();t(await this.#s(i));const s=Date.now()-e;a.info(`Vended World data to User [${i}] in ${Math.round(s)}ms`)}catch(e){a.error(e),t({})}}static async#s(e){const{config:t,db:s,game:a,release:i,logger:o}=global,{documentTypes:r,model:n,paused:d,template:c}=a,m=a.world;if(!a.users.find((t=>t.id===e)))throw new Error(`The requested user ID ${e} does not exist`);const l=await global.db.Setting.getValue("core.moduleConfiguration")||{},u=Array.from(m.relationships.requires).concat(Array.from(m.system.relationships.requires)),p=m.modules.map((e=>(e=e.vend(),u.find((t=>t.id===e.id))&&(l[e.id]=!0),e.active=l[e.id]??!1,e)));await global.db.Setting.set("core.moduleConfiguration",l);const h={userId:e,release:i,world:m.vend(),system:m.system.vend(),modules:p,demoMode:t.options.demoMode,addresses:t.express.getInvitationLinks(),files:t.files.clientConfig,options:{language:t.options.language,port:t.options.port,routePrefix:t.options.routePrefix,updateChannel:t.options.updateChannel,debug:t.options.debug},activeUsers:Array.from(Object.keys(a.activity.users)),documentTypes:r,template:c,model:n,paused:d},g=[];return g.push(s.User.dump().then((e=>h.users=e))),g.push(s.Actor.dump({sort:"name"}).then((e=>h.actors=e))),g.push(s.Cards.dump({sort:"name"}).then((e=>h.cards=e))),g.push(s.ChatMessage.dump({sort:"timestamp"}).then((e=>h.messages=e))),g.push(s.Combat.dump().then((e=>h.combats=e))),g.push(s.Folder.dump({sort:"name"}).then((e=>h.folders=e))),g.push(s.Item.dump({sort:"name"}).then((e=>h.items=e))),g.push(s.JournalEntry.dump().then((e=>h.journal=e))),g.push(s.Macro.dump().then((e=>h.macros=e))),g.push(s.Playlist.dump({sort:"name"}).then((e=>h.playlists=e))),g.push(s.RollTable.dump({sort:"name"}).then((e=>h.tables=e))),g.push(s.Scene.dump({sort:"name"}).then((e=>h.scenes=e))),g.push(s.Setting.dump().then((e=>h.settings=e))),h.packs=await Promise.all(m.getActivePacks(l).map((async e=>{delete(e=deepClone(e)).absPath;const t=s.packs.get(e.id);if(t)try{e.index=await t.getIndex(t.metadata.compendiumIndexFields)}catch(e){o.error(`Unable to load pack '${t.filename}': ${e.message}`)}return e}))),g.push(t.updater.checkCoreUpdateAvailability().then((e=>h.coreUpdate=e))),g.push(m.system.getUpdateNotification().then((e=>h.systemUpdate=e))),await Promise.all(g),h}static async _onManageCompendium(e,{action:t,type:s,data:a,options:i}={}){switch(t){case"create":return this._onCreateCompendium(e,a,i);case"delete":return this._onDeleteCompendium(e,a,i);case"migrate":return this._onMigrateCompendium(e,a,i);default:throw new Error(`Invalid Compendium management action ${t} requested`)}}static async _onCreateCompendium(e,t,s={}){if(!e.isGM)throw new Error(`User ${e.name} cannot create a new Compendium pack`);const a=game.world,i=BaseWorld.schema.fields.packs.element;if(t.name=t.name||t.label.slugify({strict:!0}),t.name||(t.name=`${t.type}-${randomID()}`),t.path=`packs/${t.name}.db`,t.system=a.system.id,(t=i.clean(t)).package="world",db.packs.has(`${t.package}.${t.name}`))throw new Error(`The Compendium pack ${t.name} already exists in the World and cannot be created`);const o=i.validate(t);if(!isEmpty(o)){const e=this.formatValidationErrors(o,{label:"Invalid Compendium Pack Data:"});throw new Error(e)}game.world._createPack(t);const r=a.packs.find((e=>e.name===t.name)),n=global.db.defineCompendium(r);if(s.source){const e=db.packs.get(s.source)||null;e&&fs.copyFileSync(e.filename,n.filename)}return await n.connect(),logger.info(`Created World Compendium Pack ${n.collectionName}`),t.id=`world.${t.name}`,t.packageType="world",t.packageName=a.id,t.index=await n.getIndex(n.metadata.compendiumIndexFields),t}static async _onDeleteCompendium(e,t,s={}){if(!e.isGM)throw new Error(`User ${e.name} cannot delete a Compendium pack`);const a=`world.${t}`;if(!db.packs.has(a))throw new Error(`The requested World pack name ${t} does not exist`);const i=db.packs.get(`world.${t}`);await i.deleteCompendium(),game.world._source.packs.findSplice((e=>e.name===i.packData.name)),game.world.reset(),game.world.save()}static async _onMigrateCompendium(e,t,s={}){if(!e.isGM)throw new Error(`User ${e.name} cannot migrate a Compendium Pack`);const a=db.packs.get(t);if(!a)throw new Error(`The Compendium Pack ${t} does not exist!`);return a.connected||await a.connect(),await a.migrate({user:e,...s}),a.packData}}