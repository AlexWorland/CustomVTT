import ServerDocumentMixin from"../backend/server-document.mjs";import BaseUser from"../../../common/documents/user.mjs";import sessions from"../../sessions.mjs";import{createPassword}from"../../core/auth.mjs";import{USER_ROLES}from"../../../common/constants.mjs";export default class User extends(ServerDocumentMixin(BaseUser)){get sessions(){return sessions.getUserSessions(this.id)}get sockets(){const s=[];for(let e of config.sockets.values())e.userId===this.id&&s.push(e);return s}get isActive(){return!!this.id&&(game.active&&game.activity&&this.id in game.activity.users)}async _preCreate(s,e,t){await this._validateUnique();const{hash:r,salt:a}=createPassword(this.password);this.updateSource({password:r,passwordSalt:a})}_onCreate(s,e,t){super._onCreate(s,e,t),game.users.push(this)}async _preUpdate(s,e,t){if(await super._preUpdate(s,e,t),await this._validateUnique(),"password"in s){const{hash:e,salt:t}=createPassword(s.password);this.updateSource({password:e,passwordSalt:t}),sessions.deactivateUserSession(this.id)}}_onUpdate(s,e,t){super._onUpdate(s,e,t),db.User.get(this.id).then((s=>game.users.findSplice((s=>s.id===this.id),s)))}_onDelete(s,e){super._onDelete(s,e),game.users.findSplice((s=>s.id===this.id))}async _validateUnique(){if((await User.find({name:this.name})).find((s=>s.id!==this.id)))throw Error(`User names must be unique, the name ${this.name} is already taken`)}static async dump(s={}){const e=await super.dump(s);return e.forEach((s=>{delete s.password,delete s.passwordSalt})),e.sort(this._sort),e}static fromSource(s,{safe:e=!1,...t}={}){const r=super.fromSource(s,t);return e&&r.updateSource({password:"",passwordSalt:""}),r}static async find(s={},e={}){const t=await super.find(s,e);return t.sort(this._sort),t}static async getUsers(){const s=await User.find({}),e=game.activity.users;for(let t of s){if(!t.id)continue;const s=e[t.id]||{};t.viewedScene=s.sceneId||null}return game.users=s}static _sort(s,e){let t=s.role>=USER_ROLES.ASSISTANT?s.role:1,r=e.role>=USER_ROLES.ASSISTANT?e.role:1;return t!==r?r-t:s.name.localeCompare(e.name)}}