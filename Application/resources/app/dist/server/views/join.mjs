import View from"./view.mjs";import sessions from"../../sessions.mjs";import{Module}from"../../packages/_module.mjs";import{PASSWORD_SAFE_STRING}from"../../../common/constants.mjs";export default class JoinView extends View{route="/join";socket="getJoinData";_template="join";_methods=["get","post"];async handleGet(s,e){const{game:o}=global;if(!o.world)return this._noWorld(s,e);if(!o.ready)return setTimeout((()=>this.handleGet(s,e)),1e3);sessions.logoutWorld(s,e);const t=o.world.background||null,a=View._getStaticContent({setup:!0});return e.render(this._template,{bodyClass:"vtt players "+(t?"background":""),bodyStyle:`background-image: url('${t||"ui/denim075.png"}')`,messages:sessions.getMessages(s),scripts:a.scripts,styles:a.styles})}async handlePost(s,e){const{config:o,game:t}=global;if(!t.world)return this._noWorld(s,e);let a={};switch(s.body.action){case"shutdown":if(o.options.demoMode)return e.status(401),e.send("This option is not available for servers running in demo mode"),e;if(!o.adminPassword)return e.status(403),e.send("ERROR.InvalidAdminKey"),e;if(!sessions.authenticateAdmin(s,e).success)return e.send(s.session.messages.pop()?.message),s.session.messages=[],e;a=await t.world.deactivate(s,{asAdmin:!0}),a.status="success",a.message="The game world has been successfully deactivated";break;case"join":if(sessions.logoutWorld(s,e),a=await sessions.authenticateUser(s,e),"failed"===a.status)return e}return e.json(a)}async handleSocket(s,e){const{game:o}=global;return o.world?e({release:global.release,world:o.world.vend(),modules:Module.getPackages({coreTranslation:!0}).map((s=>s.vend())),passwordString:PASSWORD_SAFE_STRING,isAdmin:s.admin,users:await db.User.dump(),activeUsers:Array.from(Object.keys(o.activity.users)),userId:s.worlds[o.world.id]||null,options:{language:global.config.options.language}}):e({})}}